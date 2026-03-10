import { IsString, IsEnum, IsOptional, IsDateString, MaxLength, IsInt, Min, Max } from 'class-validator';

export enum SessionType {
  VIDEO = 'VIDEO',
  CHAT = 'CHAT',
  AUDIO = 'AUDIO',
}

export class CreateBookingDto {
  @IsString()
  psychologistId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(120)
  durationMinutes?: number = 60;

  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType = SessionType.VIDEO;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(['DIPANGGIL', 'SEDANG_DILAYANI', 'SELESAI', 'DILEWATI', 'BATAL'])
  status: string;

  @IsOptional()
  @IsDateString()
  jam_dipanggil?: string;

  @IsOptional()
  @IsDateString()
  jam_selesai?: string;
}
