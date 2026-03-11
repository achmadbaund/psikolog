import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SessionType {
  VIDEO = 'VIDEO',
  CHAT = 'CHAT',
  AUDIO = 'AUDIO',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export class BookingSessionWrite {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  sessionType: SessionType;
  sessionUrl?: string;
  recordingUrl?: string;
}

@Entity('bookings')
export class BookingWrite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  psychologistId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'json', nullable: true })
  session: BookingSessionWrite;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  consultationNotes: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
