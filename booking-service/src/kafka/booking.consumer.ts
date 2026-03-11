import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { CommandBus } from '@nestjs/cqrs';
import { CreateBookingCommand } from '../booking/commands/impl/create-booking.command';
import { SessionType } from '../booking/entities/write/booking-write.entity';
import * as crypto from 'crypto';

interface BookingEvent {
  id: string;
  faskes_id: string;
  faskes_name: string;
  dokter_id: string;
  dokter_name: string;
  spesialisasi: string;
  pasien_id: string;
  jadwal: string;
  session_type: string;
  notes: string;
  status: string;
  created_at: string;
  source: string;
  timestamp?: string;
}

@Injectable()
export class BookingConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly commandBus: CommandBus,
  ) {}

  async onModuleInit() {
    // Check if Kafka consumer is enabled
    const kafkaEnabled = process.env.KAFKA_CONSUMER_ENABLED === 'true';

    if (!kafkaEnabled) {
      this.logger.warn('Kafka Consumer is DISABLED. Set KAFKA_CONSUMER_ENABLED=true to enable.');
      return;
    }

    try {
      this.logger.log('Initializing Kafka Consumer...');

      const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
      const groupId = process.env.KAFKA_GROUP_ID || 'booking-processor';
      const topic = process.env.KAFKA_TOPIC || 'booking-events';

      this.logger.log(`Kafka Brokers: ${brokers}`);
      this.logger.log(`Consumer Group: ${groupId}`);
      this.logger.log(`Topic: ${topic}`);

      // Create Kafka client
      this.kafka = new Kafka({
        clientId: 'booking-service',
        brokers: brokers.split(','),
      });

      // Create consumer
      this.consumer = this.kafka.consumer({ groupId });

      // Connect consumer
      await this.consumer.connect();
      this.logger.log('Kafka Consumer connected successfully');

      // Subscribe to topic
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Subscribed to topic: ${topic}`);

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleBookingMessage(payload);
        },
      });

      this.logger.log('Kafka Consumer is now listening for messages...');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka Consumer:', error);
    }
  }

  private async handleBookingMessage(payload: EachMessagePayload) {
    try {
      const { topic, partition, message } = payload;

      // Parse message
      const event: BookingEvent = JSON.parse(message.value.toString());

      this.logger.log(`Received booking event: ${event.id}`);
      this.logger.log(`Faskes: ${event.faskes_name}`);
      this.logger.log(`Psychologist: ${event.dokter_name} (${event.spesialisasi})`);
      this.logger.log(`Patient: ${event.pasien_id}`);
      this.logger.log(`Scheduled: ${event.jadwal}`);

      // Validate and generate UUID for userId if needed
      let userId = event.pasien_id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        this.logger.warn(`Invalid UUID for pasien_id: ${userId}, generating random UUID`);
        userId = crypto.randomUUID();
      }

      // Execute CreateBookingCommand through CQRS
      const command = new CreateBookingCommand(
        event.id, // Use Kafka event ID
        userId,
        event.dokter_id,
        new Date(event.jadwal),
        event.notes || `Booking from ${event.faskes_name}`,
        (event.session_type as SessionType) || SessionType.VIDEO,
        60, // Default 60 minutes
      );

      const booking = await this.commandBus.execute(command);

      this.logger.log(`Booking created successfully via CQRS: ${booking.id}`);
      this.logger.log(`Status: ${booking.status}`);
    } catch (error) {
      this.logger.error(`Error processing booking message:`, error);
    }
  }
}
