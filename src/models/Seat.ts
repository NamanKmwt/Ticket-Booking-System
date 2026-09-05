import {Schema ,model , Document , Types  } from 'mongoose';
import {SeatStatus} from './types.js'

export interface ISeat extends Document {
    eventId : Types.ObjectId, 
    row : string , 
    number : number, 
    price : number , 
    status : SeatStatus, 
    version : number
}

const seatSchema = new Schema<ISeat>(
    {
        eventId : {type : Schema.Types.ObjectId, ref: 'Event' , required : true , index : true}, 
        row : {type : String , required : true} , 
        number: { type: Number, required: true },
        price: { type: Number, required: true, min: 0 },
        status: { 
            type: String, 
            enum: Object.values(SeatStatus), 
            default: SeatStatus.AVAILABLE,
            index: true 
        }
    },
    {
        timestamps : true , 
        optimisticConcurrency : true 
    }
)

seatSchema.index({ eventId: 1, row: 1, number: 1 }, { unique: true });

export const Seat = model<ISeat>('Seat' , seatSchema)