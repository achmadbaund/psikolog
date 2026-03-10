import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BookingModule } from './booking/booking.module';
import { PsychologistModule } from './psychologist/psychologist.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Check if DATABASE_URL exists (Railway/Render format)
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // Parse DATABASE_URL format: postgres://user:pass@host:port/db
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.substring(1), // Remove leading slash
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          };
        }

        // Fallback to individual env vars (Docker/local format)
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST') || 'postgres',
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'postgres',
          database: configService.get<string>('DB_NAME') || 'psikolog_db',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    BookingModule,
    PsychologistModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
