import mongoose from 'mongoose'
import dotenv from 'dotenv'
import {Venue} from '../models/Venue.js'
import { Event } from '../models/Event.js';
import { Seat } from '../models/Seat.js';
import { Order } from '../models/Order.js';

dotenv.config();
const MONGO_URI  = process.env.MONGO_URI

if(!MONGO_URI){
    console.error('FATAL ERROR: MONGO_URI is not defined in .env');
    process.exit(1);
}


const seedDatabase = async() : Promise<void>=>{
    try{
        console.log('connnecting to mongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected Successfully');

        console.log('Clearing existing collections...');
        await Promise.all([
        Venue.deleteMany({}),
        Event.deleteMany({}),
        Seat.deleteMany({}),
        Order.deleteMany({})
        ]);

        //this is a test venue
        const venue = await Venue.create({
            name: 'Tech Arena',
            city: 'San Francisco',
            capacity: 50 
        });
        console.log(`Created Venue: ${venue.name}`);
        

        //this is a test event 
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 7);

        const event = await Event.create({
            name: 'Distributed Systems Summit 2026',
            venueId: venue._id,
            date: eventDate
        });
        console.log(`Created Event: ${event.name}`);

        // this is seat grid
        const seatsToInsert = [];
        const rows = ['A', 'B', 'C', 'D', 'E'];

        for (const row of rows) {
            for (let number = 1; number <= 10; number++) {
                seatsToInsert.push({
                eventId: event._id,
                row,
                number,
                // Premium pricing for Row A
                price: row === 'A' ? 250 : 100,
                });
            }
        }
        await Seat.insertMany(seatsToInsert);
        console.log(`Successfully generated and inserted ${seatsToInsert.length} seats.`);

        console.log('Database seeding complete!');
        process.exit(0);
    }catch(error){
        console.error('Failed to seed database:', error);
        process.exit(1);    
    }
}

seedDatabase();