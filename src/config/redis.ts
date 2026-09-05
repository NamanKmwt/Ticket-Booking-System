import {Redis} from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

const REDIS_URL =  process.env.REDIS_URL

if (!REDIS_URL) {
  throw new Error('FATAL ERROR: REDIS_URL is not defined in .env');
}

export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('🔗 Successfully connected to Redis');
});

redisClient.on('error', (err: unknown) => {
  console.error('❌ Redis Connection Error:', err);
});