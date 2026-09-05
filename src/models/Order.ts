import {Schema , model , Document , Types} from 'mongoose'
import {OrderStatus} from './types.js'

export interface IOrder extends Document {
  eventId: Types.ObjectId;
  seatIds: Types.ObjectId[];
  userId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    seatIds: [{ type: Schema.Types.ObjectId, ref: 'Seat', required: true }],
    userId: { type: String, required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true
    }
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);