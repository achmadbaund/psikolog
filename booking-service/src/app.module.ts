import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BookingModule } from './booking/booking.module';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { writeDbConfig, readDbConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    // Default connection for legacy support
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const useCQRS = configService.get<string>('CQRS_ENABLED') === 'true';

        if (useCQRS) {
          // CQRS Mode: Use write connection as default for legacy entities
          return writeDbConfig(configService);
        }

        // Legacy Mode: PostgreSQL config
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
      },
    }),
    // Named connections for CQRS
    TypeOrmModule.forRootAsync({
      name: 'writeConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: writeDbConfig,
    }),
    TypeOrmModule.forRootAsync({
      name: 'readConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: readDbConfig,
    }),
    BookingModule,
    HealthModule,
    KafkaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
