"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)());
    if (configService.get('TRUST_PROXY', false)) {
        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.set('trust proxy', 1);
    }
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const corsOrigins = configService.get('CORS_ORIGINS', '*');
    const originList = corsOrigins === '*'
        ? true
        : corsOrigins
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    app.enableCors({
        origin: originList,
        credentials: true,
    });
    const isProduction = configService.get('NODE_ENV') === 'production';
    const enableSwagger = configService.get('ENABLE_SWAGGER', false);
    if (!isProduction || enableSwagger) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('El Awal Educational Management Platform API')
            .setDescription('Comprehensive REST API specifications for Physical Classrooms, Asynchronous Online Learning, QR Roll-Call, Auto-Grading, and Guardian Portals.')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT Bearer token',
            in: 'header',
        }, 'JWT-auth')
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
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        logger.log(`📚 Swagger API Docs available on /api/docs`);
    }
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    logger.log(`🚀 NestJS Backend Server running on port ${port} (Environment: ${configService.get('NODE_ENV', 'development')})`);
}
bootstrap();
//# sourceMappingURL=main.js.map