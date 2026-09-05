import {Schema, model , Document, Types} from 'mongoose'

export interface IEvent extends Document {
  name: string;
  venueId: Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Event = model<IEvent>('Event', eventSchema);