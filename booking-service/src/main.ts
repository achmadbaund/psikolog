import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Enable CORS
  app.enableCors();

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Booking Psikologi Service API')
    .setDescription('API untuk mengelola booking konsultasi psikologi')
    .setVersion('1.0')
    .addTag('Psychology Bookings')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 8003;
  await app.listen(port);
  console.log(`Booking Service is running on port ${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
