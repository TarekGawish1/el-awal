"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
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
    app.enableCors({
        origin: corsOrigins === '*' ? true : corsOrigins.split(','),
        credentials: true,
    });
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
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    logger.log(`🚀 NestJS Backend Server running on http://localhost:${port}/api/v1`);
    logger.log(`📚 Swagger API Docs available on http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map