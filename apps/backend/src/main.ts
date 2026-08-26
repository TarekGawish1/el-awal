import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from './core/logger/app-logger.service';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import helmet from 'helmet';

async function bootstrap() {
  const appLogger = new AppLogger();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });
  const configService = app.get(ConfigService);

  // Security Headers via Helmet (allow cross-origin asset loading)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Serve uploads directory statically with auto-creation
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath));

  // Trust upstream reverse proxy (e.g. Nginx, Cloudflare) if configured
  if (configService.get<boolean>('TRUST_PROXY', false)) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);
  }

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
  const rawCors = configService.get<string>('CORS_ORIGINS', '*');
  const allowedList =
    rawCors === '*'
      ? ['*']
      : rawCors
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, mobile apps, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // If wildcard is configured
      if (allowedList.includes('*')) {
        return callback(null, true);
      }

      // Check explicit allowlist
      if (allowedList.includes(origin)) {
        return callback(null, true);
      }

      // Automatically allow local development origins (localhost & 127.0.0.1 on any port)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }

      // Automatically allow Vercel and Heroku deployment origins
      if (/^https:\/\/(.*\.)?(vercel\.app|herokuapp\.com)$/i.test(origin)) {
        return callback(null, true);
      }

      logger.warn(`⚠️ CORS blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['x-correlation-id'],
  });

  // OpenAPI / Swagger Documentation Setup (gated in production unless ENABLE_SWAGGER=true)
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER', false);

  if (!isProduction || enableSwagger) {
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
    logger.log(`📚 Swagger API Docs available on /api/docs`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 NestJS Backend Server running on port ${port} (Environment: ${configService.get<string>('NODE_ENV', 'development')}) - Onsite Homework Delivery & Attendance Sync v1.0.1 ready`);
}

bootstrap();
