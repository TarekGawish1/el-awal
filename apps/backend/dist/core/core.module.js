"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const env_validation_1 = require("./config/env.validation");
const database_module_1 = require("./database/database.module");
const security_module_1 = require("./security/security.module");
const jwt_auth_guard_1 = require("./security/guards/jwt-auth.guard");
const roles_guard_1 = require("./security/guards/roles.guard");
const resource_ownership_guard_1 = require("./security/guards/resource-ownership.guard");
const global_exception_filter_1 = require("./filters/global-exception.filter");
const prisma_client_exception_filter_1 = require("./filters/prisma-client-exception.filter");
const transform_response_interceptor_1 = require("./interceptors/transform-response.interceptor");
const logging_interceptor_1 = require("./interceptors/logging.interceptor");
const correlation_id_middleware_1 = require("./middleware/correlation-id.middleware");
let CoreModule = class CoreModule {
    configure(consumer) {
        consumer.apply(correlation_id_middleware_1.CorrelationIdMiddleware).forRoutes('*');
    }
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: env_validation_1.validateEnv,
                envFilePath: ['.env', '.env.local'],
            }),
            database_module_1.DatabaseModule,
            security_module_1.SecurityModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: prisma_client_exception_filter_1.PrismaClientExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: transform_response_interceptor_1.TransformResponseInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: resource_ownership_guard_1.ResourceOwnershipGuard,
            },
        ],
        exports: [database_module_1.DatabaseModule, security_module_1.SecurityModule],
    })
], CoreModule);
//# sourceMappingURL=core.module.js.map