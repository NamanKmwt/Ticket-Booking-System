// src/workers/expirationWorker.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ExpirationPollingService } from '../services/ExpirationPollingService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI is not defined for expiration worker.');
  process.exit(1);
}

const startExpirationWorker = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Expiration Polling Worker connected to MongoDB');

    console.log('⏱️ Expiration Polling Worker active. Checking for stale cart holds every 30s...');

    // Run every 30 seconds
    setInterval(async () => {
      await ExpirationPollingService.releaseStaleHolds();
    }, 30000);

  } catch (error) {
    console.error('❌ Expiration Worker failed to start:', error);
    process.exit(1);
  }
};

startExpirationWorker();