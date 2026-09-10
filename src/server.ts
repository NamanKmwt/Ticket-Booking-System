// src/server.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import { redisClient } from './config/redis.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI is not defined.');
  process.exit(1);
}

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Successfully connected to MongoDB');

    // Ensure Redis is ready
    await redisClient.ping();

    app.listen(PORT, () => {
      console.log(`🚀 Ticket Booking Engine running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();