import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global REST API prefix
  app.setGlobalPrefix('api/v1');

  // Strict Request DTO Validation Pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS Policy Configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(','),
    credentials: true,
  });

  // OpenAPI / Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('El Awal Educational Management Platform API')
    .setDescription(
      'Comprehensive REST API specifications for Physical Classrooms, Asynchronous Online Learning, QR Roll-Call, Auto-Grading, and Guardian Portals.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Bearer token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Login and token lifecycle management')
    .addTag('Users', 'User identities and profile access')
    .addTag('Students', 'Student academic profiles and QR credentials')
    .addTag('Academic Groups', 'Physical classroom cohorts and rosters')
    .addTag('Lesson Schedules', 'Weekly recurring timetables')
    .addTag('Attendance & Absence', 'Physical roll-call via QR scans and reporting')
    .addTag('Online Courses', 'Course modules, lessons, and catalog discovery')
    .addTag('Educational Content', 'Cloudflare R2 presigned file and lecture uploads')
    .addTag('Assessments & Exams', 'Homework and auto-graded exam authoring')
    .addTag('Parent Portal', 'Consolidated academic and attendance reporting for guardians')
    .addTag('Notifications', 'System alerts and in-app event feeds')
    .addTag('Subscriptions & Payments', 'Physical group fee tracking and billing reconciliation')
    .addTag('Offline Sync Engine', 'Outbox batch intake and monotonic progress reconciliation')
    .addTag('Health & Telemetry', 'Liveness, readiness, and PostgreSQL health probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 NestJS Backend Server running on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger API Docs available on http://localhost:${port}/api/docs`);
}

bootstrap();
