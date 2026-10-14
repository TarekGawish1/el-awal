import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from './core/logger/app-logger.service';
import fastifyCookie from '@fastify/cookie';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import cluster from 'node:cluster';
import { startClusterMaster } from './core/cluster/cluster-master';
import { ClusterService } from './core/cluster/cluster.service';

import { shouldRedirectToCanonicalPlatform } from './core/middleware/canonical-redirect.util';

async function bootstrap() {
  const appLogger = new AppLogger();
  const logger = new Logger('Bootstrap');

  const fastifyAdapter = new FastifyAdapter({
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      logger: appLogger,
    },
  );
  const configService = app.get(ConfigService);
  const clusterService = app.get(ClusterService);

  // Register high-performance Fastify plugins
  await app.register(fastifyCookie as any);
  await app.register(fastifyCompress as any);
  await app.register(fastifyHelmet as any, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB max upload (allows lecture videos and document uploads)
    },
  });

  // Canonical Platform Redirection via Fastify hook:
  // If an external user or browser accesses the raw Heroku backend URL directly
  // (e.g. '*.herokuapp.com'), redirect them to the canonical frontend platform.
  // API subdomain requests (e.g. 'api.al-awal.online') must never be redirected.
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const canonicalAppUrl = configService
    .get<string>('NEXT_PUBLIC_APP_URL', 'https://al-awal.online')
    .replace(/\/+$/, '');

  fastifyInstance.addHook('onRequest', (request: any, reply: any, done: any) => {
    const url = request.url || '/';

    // Record incoming requests for real-time traffic surge auto-scaling (skip internal health pings)
    if (!url.startsWith('/api/health')) {
      clusterService.recordRequest();
    }

    // Strip Content-Type: application/json from body-less requests to prevent FST_ERR_CTP_EMPTY_JSON_BODY (400)
    const contentType = request.headers['content-type'];
    const contentLength = request.headers['content-length'];
    if (
      contentType &&
      contentType.includes('application/json') &&
      (!contentLength || contentLength === '0') &&
      ['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(request.method)
    ) {
      delete request.headers['content-type'];
    }

    const rawHost = (
      request.headers['x-forwarded-host'] ||
      request.headers.host ||
      request.hostname ||
      ''
    ).toString();
    if (shouldRedirectToCanonicalPlatform(rawHost, request.method, url)) {
      const targetPath = url.startsWith('/') ? url : `/${url}`;
      reply.redirect(`${canonicalAppUrl}${targetPath}`, 301);
      return;
    }
    done();
  });

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
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
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
    maxAge: 86400, // Cache preflight OPTIONS responses in browsers for 24 hours
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

  const workerInfo = process.env.WORKER_ID ? `[Worker ${process.env.WORKER_ID} PID: ${process.pid}] ` : '';
  logger.log(`🚀 ${workerInfo}NestJS Backend Server running on port ${port} (Environment: ${configService.get<string>('NODE_ENV', 'development')}) - Onsite Homework Delivery & Attendance Sync v1.0.1 ready`);
}

const isClusterMode =
  process.env.ENABLE_CLUSTER === 'true' ||
  (process.env.ENABLE_CLUSTER !== 'false' && process.env.NODE_ENV === 'production');

if (cluster.isPrimary && isClusterMode) {
  startClusterMaster();
} else {
  bootstrap().catch((err) => {
    console.error('BOOTSTRAP ERROR FULL:', err);
    process.exit(1);
  });
}
