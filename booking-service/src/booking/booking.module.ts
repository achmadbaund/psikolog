import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking, BookingSession } from './entities/booking.entity';
import { PsychologistModule } from '../psychologist/psychologist.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSession]),
    PsychologistModule,
    HttpModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
