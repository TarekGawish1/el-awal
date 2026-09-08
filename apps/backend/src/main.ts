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

  // Ensure local uploads directory exists for internal storage handlers
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  // Public raw express static serving on '/uploads' disabled for security hardening:
  // prevents unauthenticated access to private student documents and receipts.

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

  // CORS Policy Configuration - Restricted strictly to essential domains (no wildcard *)
  const rawCors = configService.get<string>('CORS_ORIGINS', '');
  const explicitAllowedOrigins = rawCors
    .split(',')
    .map((origin) => origin.trim().toLowerCase())
    .filter((origin) => origin && origin !== '*');

  const isOriginPermitted = (origin: string): boolean => {
    const normalized = origin.toLowerCase().trim();

    // 1. Explicitly configured origins from CORS_ORIGINS
    if (explicitAllowedOrigins.includes(normalized)) {
      return true;
    }

    // 2. Production platform domain and subdomains (al-awal.online)
    if (/^https:\/\/(.*\.)?al-awal\.online$/i.test(normalized)) {
      return true;
    }

    // 3. Vercel deployment preview and production domains
    if (/^https:\/\/(.*\.)?vercel\.app$/i.test(normalized)) {
      return true;
    }

    // 4. Heroku deployment domain (for Swagger/OpenAPI interactive tests)
    if (/^https:\/\/(.*\.)?herokuapp\.com$/i.test(normalized)) {
      return true;
    }

    // 5. Localhost and 127.0.0.1 for development environments
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
      return true;
    }

    return false;
  };

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, PWA service workers)
      if (!origin) {
        return callback(null, true);
      }

      if (isOriginPermitted(origin)) {
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
