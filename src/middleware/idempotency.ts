// src/middlewares/idempotency.ts
import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';
import { StatusCodes } from 'http-status-codes';

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'];

  // If the client didn't provide a key, let the request pass through normally
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  const redisKey = `idempotency:${idempotencyKey}`;

  try {
    // 1. Check if we have already processed this key
    const cachedResponse = await redisClient.get(redisKey);

    if (cachedResponse) {
      console.log(`🔄 Idempotent hit for key: ${idempotencyKey}. Returning cached response.`);
      const parsed = JSON.parse(cachedResponse) as { status: number; body: unknown };
      res.status(parsed.status).json(parsed.body);
      return;
    }

    // 2. Intercept res.json to capture the response before sending it to the client
    const originalJson = res.json.bind(res);

    res.json = (body: unknown): Response => {
      // Cache the response in Redis for 15 minutes (900 seconds)
      const responseData = {
        status: res.statusCode,
        body,
      };
      
      // Store asynchronously without blocking response return
      redisClient.set(redisKey, JSON.stringify(responseData), 'EX', 900).catch(err => {
        console.error('Failed to cache idempotency key:', err);
      });

      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('❌ Idempotency Middleware Error:', error);
    // On failure, don't block the request entirely; fall back to normal execution
    next();
  }
};