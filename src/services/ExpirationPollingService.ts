// src/services/ExpirationPollingService.ts
import { Seat } from '../models/Seat.js';
import { SeatStatus } from '../models/types.js';
import { SeatCacheService } from './SeatCacheService.js';
import { redisClient } from '../config/redis.js';

export class ExpirationPollingService {
  /**
   * Periodically scans for seats that have been HELD for more than 10 minutes
   * and reverts them back to AVAILABLE.
   */
  static async releaseStaleHolds(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      // Find seats that are HELD and whose updatedAt timestamp is older than 10 minutes
      const staleSeats = await Seat.find({
        status: SeatStatus.HELD,
        updatedAt: { $lt: tenMinutesAgo },
      });

      if (staleSeats.length === 0) return;

      console.log(`🧹 Found ${staleSeats.length} stale held seats. Releasing inventory...`);

      for (const seat of staleSeats) {
        seat.status = SeatStatus.AVAILABLE;
        await seat.save();

        // Update Redis Cache Read Model
        const eventId = seat.eventId.toString();
        const redisKey = `event:${eventId}:seats`;
        const cachedSeats = await SeatCacheService.getGridCache(eventId);
        const targetSeat = cachedSeats.find(s => s.id === seat._id.toString());

        if (targetSeat) {
          targetSeat.status = SeatStatus.AVAILABLE;
          await redisClient.hset(redisKey, targetSeat.id, JSON.stringify(targetSeat));
        }

        console.log(`🔄 Released stale seat ${seat._id} back to AVAILABLE.`);
      }
    } catch (error) {
      console.error('❌ Error during stale hold cleanup polling:', error);
    }
  }
}