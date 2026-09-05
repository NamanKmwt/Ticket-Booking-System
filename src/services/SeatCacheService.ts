import {redisClient} from '../config/redis.js'
import type{ISeat} from '../models/Seat.js'
import {SeatStatus} from '../models/types.js'


export interface CachedSeat{
    id : string, 
    row : string , 
    number : number, 
    price : number , 
    status : SeatStatus
}

export class SeatCacheService{
    /**
     * Loads an array of Mongoose Seat documents into a Redis Hash.
     */
    static async initializeGridCache(eventId: string, seats: ISeat[]): Promise<void> {
        const redisKey = `event:${eventId}:seats`;
        
        // We use an object to prepare bulk insertion for HSET
        // Record<string, string> maps to { "seatId": "JSON string" }
        const hashPayload: Record<string, string> = {};

        for (const seat of seats) {
            const cachedSeat: CachedSeat = {
                id: seat._id.toString(),
                row: seat.row,
                number: seat.number,
                price: seat.price,
                status: seat.status,
            };
            hashPayload[cachedSeat.id] = JSON.stringify(cachedSeat);
        }

        // Atomically write the entire hash to Redis
        // We check Object.keys length to avoid Redis errors on empty payloads
        if (Object.keys(hashPayload).length > 0) {
            await redisClient.hset(redisKey, hashPayload);
            console.log(`✅ Cached ${seats.length} seats for event ${eventId} in Redis.`);
        }
    }
    /**
    * Retrieves the full seat grid for an event from Redis.
    */
    static async getGridCache(eventId: string): Promise<CachedSeat[]> {
        const redisKey = `event:${eventId}:seats`;
        
        // HGETALL returns an object like { "seatId": "JSON string", ... }
        const rawHash = await redisClient.hgetall(redisKey);
        
        const seats: CachedSeat[] = [];
        for (const stringifiedSeat of Object.values(rawHash)) {
        // Safely parse back to our strict interface
            seats.push(JSON.parse(stringifiedSeat) as CachedSeat);
        }

        return seats;
    }
}