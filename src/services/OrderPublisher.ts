// src/services/OrderPublisher.ts
import { rabbitMQClient } from '../config/rabbitmq.js';
import { type TicketOrderPayload, ORDER_EXCHANGE, ORDER_ROUTING_KEY } from '../types/queue.js';

export class OrderPublisher {
  /**
   * Publishes a typed ticket order payload to CloudAMQP for asynchronous background processing.
   */
  static async publishOrder(payload: TicketOrderPayload): Promise<boolean> {
    try {
      const channel = await rabbitMQClient.getChannel();

      // Convert the typed payload object into a persistent buffer
      const messageBuffer = Buffer.from(JSON.stringify(payload));

      // Publish to our direct exchange with the strict routing key
      const published = channel.publish(
        ORDER_EXCHANGE,
        ORDER_ROUTING_KEY,
        messageBuffer,
        {
          persistent: true, // Ensures message survives broker restarts
          contentType: 'application/json',
          timestamp: Date.now(),
        }
      );

      if (published) {
        console.log(`📤 Successfully published order ${payload.orderId} to CloudAMQP`);
      } else {
        console.warn(`⚠️ Channel write buffer full when publishing order ${payload.orderId}`);
      }

      return published;
    } catch (error) {
      console.error(`❌ Failed to publish order ${payload.orderId} to CloudAMQP:`, error);
      throw error;
    }
  }
}