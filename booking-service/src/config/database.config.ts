import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BookingWrite } from '../booking/entities/write/booking-write.entity';
import { BookingRead } from '../booking/entities/read/booking-read.entity';

export const writeDbConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Check if using CQRS MySQL databases
  const useCQRS = configService.get<string>('CQRS_ENABLED') === 'true';

  if (useCQRS) {
    // CQRS Mode: MySQL Write Database
    return {
      type: 'mysql' as const,
      host: configService.get<string>('WRITE_DB_HOST') || 'localhost',
      port: parseInt(configService.get<string>('WRITE_DB_PORT')) || 3306,
      username: configService.get<string>('WRITE_DB_USERNAME') || 'user',
      password: configService.get<string>('WRITE_DB_PASSWORD') || 'userpassword',
      database: configService.get<string>('WRITE_DB_DATABASE') || 'booking_write',
      entities: [BookingWrite],
      synchronize: true, // Only for development!
      logging: true,
    };
  }

  // Legacy Mode: PostgreSQL (Railway/Docker)
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const sslEnabled = configService.get<string>('NODE_ENV') === 'production';

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      type: 'postgres' as const,
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'postgres' as const,
    host: configService.get<string>('DB_HOST') || 'postgres',
    port: configService.get<number>('DB_PORT') || 5432,
    username: configService.get<string>('DB_USER') || 'postgres',
    password: configService.get<string>('DB_PASSWORD') || 'postgres',
    database: configService.get<string>('DB_NAME') || 'psikolog_db',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  };
};

export const readDbConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Check if using CQRS MySQL databases
  const useCQRS = configService.get<string>('CQRS_ENABLED') === 'true';

  if (useCQRS) {
    // CQRS Mode: MySQL Read Database
    return {
      type: 'mysql' as const,
      host: configService.get<string>('READ_DB_HOST') || 'localhost',
      port: parseInt(configService.get<string>('READ_DB_PORT')) || 3307,
      username: configService.get<string>('READ_DB_USERNAME') || 'user',
      password: configService.get<string>('READ_DB_PASSWORD') || 'userpassword',
      database: configService.get<string>('READ_DB_DATABASE') || 'booking_read',
      entities: [BookingRead],
      synchronize: true, // Only for development!
      logging: false, // Disable logging for read DB to improve performance
    };
  }

  // Legacy Mode: Same as write (single database)
  return writeDbConfig(configService);
};
