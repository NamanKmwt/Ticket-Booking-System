// src/config/rabbitmq.ts
import amqp, { type ChannelModel, type Channel } from 'amqplib';
import dotenv from 'dotenv';
import { ORDER_EXCHANGE, ORDER_QUEUE, ORDER_ROUTING_KEY } from '../types/queue.js';

dotenv.config();

class RabbitMQClient {
  private connection: ChannelModel | null = null; // <-- Updated type here
  private channel: Channel | null = null;
  private isConnecting: boolean = false;

  async connect(): Promise<Channel> {
    if (this.channel) return this.channel;
    if (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchange and queue topology
      await this.channel.assertExchange(ORDER_EXCHANGE, 'direct', { durable: true });
      await this.channel.assertQueue(ORDER_QUEUE, { durable: true });
      await this.channel.bindQueue(ORDER_QUEUE, ORDER_EXCHANGE, ORDER_ROUTING_KEY);

      console.log('🐇 Successfully connected to CloudAMQP and declared topology');
      this.isConnecting = false;
      return this.channel;
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ RabbitMQ Connection Failed:', error);
      throw error;
    }
  }

  async getChannel(): Promise<Channel> {
    if (!this.channel) {
      return await this.connect();
    }
    return this.channel;
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('🐇 RabbitMQ connection closed cleanly.');
    } catch (error) {
      console.error('Error closing RabbitMQ:', error);
    }
  }
}

export const rabbitMQClient = new RabbitMQClient();