// src/types/queue.ts
export interface TicketOrderPayload {
  orderId: string;
  eventId: string;
  seatIds: string[];
  userEmail: string;
  totalAmount: number;
  lockTokens: { seatId: string; token: string }[];
}

export const ORDER_QUEUE = 'ticket.order.process.queue';
export const ORDER_EXCHANGE = 'ticket.orders.exchange';
export const ORDER_ROUTING_KEY = 'order.process';