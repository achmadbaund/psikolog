import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus, BookingSession, SessionType } from './entities/booking.entity';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto/booking.dto';
import { PaginationDto } from './dto/common.dto';
import * as crypto from 'crypto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async findAll(query: any, pagination: PaginationDto) {
    const { page = 0, size = 20 } = pagination;
    const { userId, psychologistId, status, startDate, endDate } = query;

    const queryBuilder = this.bookingRepository.createQueryBuilder('booking')
      .where('booking.status != :canceled', { canceled: BookingStatus.CANCELLED });

    if (userId) {
      queryBuilder.andWhere('booking.userId = :userId', { userId });
    }

    if (psychologistId) {
      queryBuilder.andWhere('booking.psychologistId = :psychologistId', { psychologistId });
    }

    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('booking.scheduledAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('booking.scheduledAt <= :endDate', { endDate });
    }

    const [data, total] = await queryBuilder
      .skip(page * size)
      .take(size)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size),
        hasNext: (page + 1) * size < total,
        hasPrevious: page > 0,
      },
    };
  }

  async findOne(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return { data: booking };
  }

  async create(createBookingDto: CreateBookingDto) {
    // Create booking
    const booking = new Booking();
    booking.userId = crypto.randomUUID(); // TODO: Get from auth context
    booking.psychologistId = createBookingDto.psychologistId;
    booking.scheduledAt = new Date(createBookingDto.scheduledAt);
    booking.notes = createBookingDto.notes;
    booking.status = BookingStatus.PENDING;

    // Create session
    const session = new BookingSession();
    session.id = crypto.randomUUID();
    session.startTime = new Date(createBookingDto.scheduledAt);
    session.endTime = new Date(
      new Date(createBookingDto.scheduledAt).getTime() +
      (createBookingDto.durationMinutes || 60) * 60000
    );
    session.durationMinutes = createBookingDto.durationMinutes || 60;
    session.sessionType = createBookingDto.sessionType || SessionType.VIDEO;

    booking.session = session;

    const savedBooking = await this.bookingRepository.save(booking);

    return savedBooking;
  }

  async update(bookingId: string, updateBookingDto: UpdateBookingDto) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only update PENDING bookings');
    }

    Object.assign(booking, updateBookingDto);

    if (updateBookingDto.scheduledAt) {
      booking.scheduledAt = new Date(updateBookingDto.scheduledAt);
      // Update session time
      if (booking.session) {
        booking.session.startTime = new Date(updateBookingDto.scheduledAt);
        booking.session.endTime = new Date(
          new Date(updateBookingDto.scheduledAt).getTime() +
          booking.session.durationMinutes * 60000
        );
      }
    }

    return this.bookingRepository.save(booking);
  }

  async remove(bookingId: string, cancelDto?: CancelBookingDto) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.consultationNotes = cancelDto?.cancellationReason || '';

    return this.bookingRepository.save(booking);
  }

  async joinSession(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['psychologist', 'session'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const now = new Date();

    // Check if it's time to join
    const sessionStart = new Date(booking.session.startTime);
    const sessionEnd = new Date(booking.session.endTime);

    if (now < sessionStart) {
      throw new BadRequestException('Too early to join session');
    }

    if (now > sessionEnd) {
      throw new BadRequestException('Session has ended');
    }

    // Generate mock session URL
    const sessionUrl = `https://video.jnn-psychology.com/session/${bookingId}`;
    booking.session.sessionUrl = sessionUrl;

    await this.bookingRepository.save(booking);

    return {
      sessionUrl,
      sessionId: bookingId,
      canJoin: true,
      message: 'You can now join the video session',
    };
  }
}
