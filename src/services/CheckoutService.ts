// src/services/CheckoutService.ts
import { LockService } from './LockService.js';
import { SeatCacheService, type CachedSeat } from './SeatCacheService.js';
import { Seat } from '../models/Seat.js';
import { SeatStatus, OrderStatus } from '../models/types.js';
import { Order } from '../models/Order.js';
import { redisClient } from '../config/redis.js';
import { OrderPublisher } from './OrderPublisher.js'; // <-- Import the publisher
import { Types } from 'mongoose';

interface HoldSeatsRequest {
  eventId: string;
  seatIds: string[];
  userEmail: string;
}

interface HoldSeatsResponse {
  success: boolean;
  message: string;
  orderId?: string;
  lockedSeatIds?: string[];
  failedSeatIds?: string[];
}

export class CheckoutService {
  static async holdSeats(request: HoldSeatsRequest): Promise<HoldSeatsResponse> {
    const { eventId, seatIds, userEmail } = request;
    const acquiredLocks: { seatId: string; token: string }[] = [];

    try {
      // Step 1: Try to acquire atomic locks for ALL requested seats
      for (const seatId of seatIds) {
        const token = await LockService.acquireSeatLock(seatId, 600000); // 10 min TTL
        
        if (!token) {
          await this.rollbackLocks(acquiredLocks);
          return {
            success: false,
            message: `Seat ${seatId} is currently locked or being purchased by someone else.`,
            failedSeatIds: [seatId],
          };
        }
        acquiredLocks.push({ seatId, token });
      }

      // Step 2: Verify seats are AVAILABLE in our Redis Cache
      const cachedSeats = await SeatCacheService.getGridCache(eventId);
      const seatMap = new Map<string, CachedSeat>();
      cachedSeats.forEach(s => seatMap.set(s.id, s));

      for (const seatId of seatIds) {
        const seat = seatMap.get(seatId);
        if (!seat || seat.status !== SeatStatus.AVAILABLE) {
          await this.rollbackLocks(acquiredLocks);
          return {
            success: false,
            message: `Seat ${seatId} is no longer available.`,
            failedSeatIds: [seatId],
          };
        }
      }

      // Step 3: Calculate total price and create a PENDING Order in MongoDB
      let totalAmount = 0;
      const objectIdSeatIds = seatIds.map(id => {
        const seat = seatMap.get(id);
        if (seat) totalAmount += seat.price;
        return new Types.ObjectId(id);
      });

      const order = await Order.create({
        eventId: new Types.ObjectId(eventId),
        seatIds: objectIdSeatIds,
        userId: userEmail,
        totalAmount,
        status: OrderStatus.PENDING,
      });

      // Step 4: Update MongoDB and Redis Cache statuses to HELD
      await Seat.updateMany(
        { _id: { $in: objectIdSeatIds } },
        { $set: { status: SeatStatus.HELD } }
      );

      const redisKey = `event:${eventId}:seats`;
      const updates: Record<string, string> = {};
      for (const seatId of seatIds) {
        const seat = seatMap.get(seatId);
        if (seat) {
          seat.status = SeatStatus.HELD;
          updates[seatId] = JSON.stringify(seat);
        }
      }
      if (Object.keys(updates).length > 0) {
        await redisClient.hset(redisKey, updates);
      }

      // Step 5: Publish event to CloudAMQP for asynchronous payment processing
      await OrderPublisher.publishOrder({
        orderId: order._id.toString(),
        eventId,
        seatIds,
        userEmail,
        totalAmount,
        lockTokens: acquiredLocks,
      });

      return {
        success: true,
        message: 'Seats held successfully. Processing order via message queue.',
        orderId: order._id.toString(),
        lockedSeatIds: seatIds,
      };

    } catch (error: unknown) {
      await this.rollbackLocks(acquiredLocks);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Checkout failed: ${errorMessage}`);
    }
  }

  private static async rollbackLocks(locks: { seatId: string; token: string }[]): Promise<void> {
    for (const lock of locks) {
      await LockService.releaseSeatLock(lock.seatId, lock.token);
    }
  }
}