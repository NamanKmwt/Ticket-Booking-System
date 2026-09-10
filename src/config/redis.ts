// src/config/redis.ts
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL 

if (!REDIS_URL) {
  throw new Error('FATAL ERROR: REDIS_URL or REDISS_URL is not defined in .env');
}

// Instantiate the Redis client with explicit TLS configuration for Upstash (rediss://)
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {
    rejectUnauthorized: false, // Required for some serverless cloud Redis providers like Upstash
  },
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('🔗 Successfully connected to Upstash Redis (TLS)');
});

redisClient.on('error', (err: unknown) => {
  console.error('❌ Upstash Redis Connection Error:', err);
});