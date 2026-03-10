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

        console.log('=== DATABASE CONFIG ===');
        console.log('DATABASE_URL present:', !!databaseUrl);

        if (databaseUrl) {
          // Parse DATABASE_URL format: postgres://user:pass@host:port/db
          const url = new URL(databaseUrl);
          const sslEnabled = process.env.NODE_ENV === 'production';

          const config = {
            type: 'postgres' as const,
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.substring(1), // Remove leading slash
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          };
          console.log('Using DATABASE_URL');
          console.log('Host:', config.host);
          console.log('Database:', config.database);
          console.log('SSL:', sslEnabled);
          console.log('=====================');
          return config;
        }

        // Fallback to individual env vars (Docker/local format)
        const sslEnabled = configService.get<string>('NODE_ENV') === 'production';

        const config = {
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
        console.log('Using individual env vars');
        console.log('Host:', config.host);
        console.log('Database:', config.database);
        console.log('SSL:', sslEnabled);
        console.log('=====================');
        return config;
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
