import {Schema ,model , Document } from 'mongoose'

export interface IVenue extends Document{
    name : string , 
    city : string , 
    capacity : number, 
    createdAt : Date , 
    updatedAt : Date
}

const venueSchema = new Schema<IVenue>({
    name: {type : String , required : true}, 
    city : {type : String , required : true}, 
    capacity : {type :  Number , required : true , min: 1} , 
    },
    {timestamps : true}
);

export const Venue = model<IVenue>('Venue' , venueSchema)