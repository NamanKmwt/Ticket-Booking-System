// src/workers/orderWorker.ts
import { rabbitMQClient } from '../config/rabbitmq.js';
import { type TicketOrderPayload, ORDER_QUEUE } from '../types/queue.js';
import { Seat } from '../models/Seat.js';
import { Order } from '../models/Order.js';
import { SeatStatus, OrderStatus } from '../models/types.js';
import { LockService } from '../services/LockService.js';
import { redisClient } from '../config/redis.js';
import { SeatCacheService } from '../services/SeatCacheService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI is not defined in worker.');
  process.exit(1);
}

const startOrderWorker = async (): Promise<void> => {
  try {
    // 1. Connect to MongoDB for state updates
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Order Worker connected to MongoDB');

    // 2. Connect to CloudAMQP channel
    const channel = await rabbitMQClient.getChannel();

    // Ensure fair dispatch (prefetch 1 message at a time per worker)
    await channel.prefetch(1);

    console.log(`👷 Order Worker is waiting for messages on queue: ${ORDER_QUEUE}...`);

    // 3. Start consuming messages with manual acknowledgments (noAck: false)
    channel.consume(
      ORDER_QUEUE,
      async (msg) => {
        if (!msg) return;

        let payload: TicketOrderPayload | null = null;
        try {
          payload = JSON.parse(msg.content.toString()) as TicketOrderPayload;
          console.log(`📥 Processing order: ${payload.orderId} for event: ${payload.eventId}`);

          // --- STEP A: Simulate Payment Gateway Interaction ---
          // In a real system, you would call Stripe/PayPal API here.
          // We will simulate a 90% success rate network call.
          const paymentSuccess = await simulatePaymentGateway(payload.totalAmount);

          if (!paymentSuccess) {
            throw new Error('Payment gateway declined the transaction.');
          }

          // --- STEP B: Finalize Database State (BOOKED) ---
          const seatObjectIds = payload.seatIds.map(id => new mongoose.Types.ObjectId(id));

          // Update MongoDB Order status to COMPLETED
          await Order.findByIdAndUpdate(payload.orderId, { status: OrderStatus.COMPLETED });

          // Update MongoDB Seats status to BOOKED
          await Seat.updateMany(
            { _id: { $in: seatObjectIds } },
            { $set: { status: SeatStatus.BOOKED } }
          );

          // --- STEP C: Update Redis Cache State ---
          const redisKey = `event:${payload.eventId}:seats`;
          const cachedSeats = await SeatCacheService.getGridCache(payload.eventId);
          const seatMap = new Map(cachedSeats.map(s => [s.id, s]));

          const cacheUpdates: Record<string, string> = {};
          for (const seatId of payload.seatIds) {
            const seat = seatMap.get(seatId);
            if (seat) {
              seat.status = SeatStatus.BOOKED;
              cacheUpdates[seatId] = JSON.stringify(seat);
            }
          }
          if (Object.keys(cacheUpdates).length > 0) {
            await redisClient.hset(redisKey, cacheUpdates);
          }

          // --- STEP D: Release Distributed Locks ---
          // Since the seats are now permanently BOOKED, we release their temporary hold locks
          for (const lock of payload.lockTokens) {
            await LockService.releaseSeatLock(lock.seatId, lock.token);
          }

          // Acknowledge message success to CloudAMQP
          channel.ack(msg);
          console.log(`✅ Order ${payload.orderId} processed successfully! Seats BOOKED.`);

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to process order ${payload?.orderId || 'unknown'}:`, errorMessage);

          if (payload) {
            // Rollback: Mark order as FAILED
            await Order.findByIdAndUpdate(payload.orderId, { status: OrderStatus.FAILED }).catch(() => {});

            // Release seats back to AVAILABLE in MongoDB
            const seatObjectIds = payload.seatIds.map(id => new mongoose.Types.ObjectId(id));
            await Seat.updateMany(
              { _id: { $in: seatObjectIds } },
              { $set: { status: SeatStatus.AVAILABLE } }
            ).catch(() => {});

            // Release Redis cache entries back to AVAILABLE
            try {
              const redisKey = `event:${payload.eventId}:seats`;
              const cachedSeats = await SeatCacheService.getGridCache(payload.eventId);
              const seatMap = new Map(cachedSeats.map(s => [s.id, s]));
              const cacheUpdates: Record<string, string> = {};
              for (const seatId of payload.seatIds) {
                const seat = seatMap.get(seatId);
                if (seat) {
                  seat.status = SeatStatus.AVAILABLE;
                  cacheUpdates[seatId] = JSON.stringify(seat);
                }
              }
              if (Object.keys(cacheUpdates).length > 0) {
                await redisClient.hset(redisKey, cacheUpdates);
              }
            } catch (cacheErr) {
              console.error('Failed to rollback Redis cache:', cacheErr);
            }

            // Release locks
            for (const lock of payload.lockTokens) {
              await LockService.releaseSeatLock(lock.seatId, lock.token).catch(() => {});
            }
          }

          // Reject message and do NOT re-queue (send to DLX or drop if no DLX configured)
          // Setting requeue to false prevents poison pill infinite loops
          channel.reject(msg, false);
        }
      },
      { noAck: false } // Manual acknowledgment enabled
    );

  } catch (error) {
    console.error('❌ Order Worker failed to start:', error);
    process.exit(1);
  }
};

/**
 * Simulates a payment gateway call with a mock delay.
 */
const simulatePaymentGateway = async (amount: number): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 95% chance of success for testing
      const success = Math.random() < 0.95;
      resolve(success);
    }, 200); // 200ms simulated network latency
  });
};

// Start the worker
startOrderWorker();