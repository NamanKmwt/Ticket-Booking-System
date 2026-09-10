// src/services/LockService.ts
import { redisClient } from '../config/redis.js';
import crypto from 'crypto';

export class LockService {
  /**
   * Attempts to acquire an atomic distributed lock for a specific seat.
   * @returns A unique lock token if successful, or null if the lock is already held.
   */
  static async acquireSeatLock(seatId: string, ttlMs: number = 60000): Promise<string | null> {
    const lockKey = `lock:seat:${seatId}`;
    const token = crypto.randomUUID();

    // Redis SET command with NX (Not Exists) and PX (Milliseconds TTL)
    // This is completely atomic in single-node Redis (or Redlock for clusters)
    const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');

    return result === 'OK' ? token : null;
  }

  /**
   * Safely releases a seat lock using a Lua script to verify ownership via the token.
   */
  static async releaseSeatLock(seatId: string, token: string): Promise<boolean> {
    const lockKey = `lock:seat:${seatId}`;

    // Lua script: Only delete the key if the current value matches our token
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
      else
          return 0
      end
    `;

    const result = await redisClient.eval(luaScript, 1, lockKey, token);
    return result === 1;
  }
}