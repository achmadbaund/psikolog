import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Booking } from '../booking/entities/booking.entity';
import { BookingConsumer } from './booking.consumer';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Booking]),
    BookingModule,
  ],
  providers: [BookingConsumer],
  exports: [],
})
export class KafkaModule {}
