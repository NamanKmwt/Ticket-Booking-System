// Update src/scripts/seed.ts to include Redis caching
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { Seat } from '../models/Seat.js';
import { Order } from '../models/Order.js';
import { SeatCacheService } from '../services/SeatCacheService.js';
import { redisClient } from '../config/redis.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in .env');
  process.exit(1);
}

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Connecting to MongoDB and Redis...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Wipe existing data
    console.log('Clearing existing collections and cache...');
    await Promise.all([
      Venue.deleteMany({}),
      Event.deleteMany({}),
      Seat.deleteMany({}),
      Order.deleteMany({})
    ]);

    // 2. Create Venue
    const venue = await Venue.create({
      name: 'Tech Arena',
      city: 'San Francisco',
      capacity: 50 
    });

    // 3. Create Event
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 7);

    const event = await Event.create({
      name: 'Distributed Systems Summit 2026',
      venueId: venue._id,
      date: eventDate
    });

    // 4. Generate Seat Grid (Rows A-E, 10 seats per row)
    const seatsToInsert = [];
    const rows = ['A', 'B', 'C', 'D', 'E'];

    for (const row of rows) {
      for (let number = 1; number <= 10; number++) {
        seatsToInsert.push({
          eventId: event._id,
          row,
          number,
          price: row === 'A' ? 250 : 100,
        });
      }
    }

    const insertedSeats = await Seat.insertMany(seatsToInsert);
    console.log(`Successfully generated and inserted ${insertedSeats.length} seats in MongoDB.`);

    // 5. Seed the Redis Cache Read Model!
    await SeatCacheService.initializeGridCache(event._id.toString(), insertedSeats);

    console.log('Database seeding & Redis caching complete!');
    
    // Clean close Redis client so script exits cleanly
    await redisClient.quit();
    process.exit(0);

  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();