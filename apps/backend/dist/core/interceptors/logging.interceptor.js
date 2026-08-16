"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let LoggingInterceptor = class LoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger('HTTP_TRAFFIC');
        this.SENSITIVE_KEYS = new Set([
            'password',
            'confirmpassword',
            'token',
            'refreshtoken',
            'accesstoken',
            'secret',
            'secretkey',
            'apikey',
            'authorization',
            'cookie',
        ]);
    }
    sanitizeData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.sanitizeData(item));
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
                sanitized[key] = '******** [REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const { method, originalUrl, query, body } = req;
        const correlationId = req.headers['x-correlation-id'] || 'N/A';
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const user = req.user;
        const userContext = user
            ? `[User: ${user.fullName || user.id} (${user.role})]`
            : '[Public / Anonymous]';
        const startTime = Date.now();
        const sanitizedBody = body && Object.keys(body).length > 0
            ? JSON.stringify(this.sanitizeData(body))
            : null;
        const queryStr = query && Object.keys(query).length > 0
            ? ` | Query: ${JSON.stringify(query)}`
            : '';
        const bodyStr = sanitizedBody ? ` | Body: ${sanitizedBody}` : '';
        this.logger.log(`--> [REQ] [${correlationId}] ${method} ${originalUrl}${queryStr}${bodyStr} | IP: ${clientIp} | ${userContext} | UA: ${userAgent}`);
        return next.handle().pipe((0, operators_1.tap)({
            next: (responseBody) => {
                const duration = Date.now() - startTime;
                const statusCode = res.statusCode;
                let payloadSummary = '';
                if (responseBody) {
                    if (responseBody.data && Array.isArray(responseBody.data)) {
                        payloadSummary = ` | Items: ${responseBody.data.length}`;
                    }
                    else if (typeof responseBody === 'object') {
                        payloadSummary = ` | Response: OK`;
                    }
                }
                this.logger.log(`<-- [RES] [${correlationId}] ${method} ${originalUrl} ${statusCode} +${duration}ms${payloadSummary} | ${userContext}`);
            },
            error: (err) => {
                const duration = Date.now() - startTime;
                const status = err?.status || err?.statusCode || 500;
                const errMessage = err?.message || 'Internal server error';
                if (status >= 500) {
                    this.logger.error(`<-- [ERR] [${correlationId}] ${method} ${originalUrl} ${status} +${duration}ms | ${userContext} | Error: ${errMessage}`, err?.stack);
                }
                else {
                    this.logger.warn(`<-- [WARN] [${correlationId}] ${method} ${originalUrl} ${status} +${duration}ms | ${userContext} | Reason: ${errMessage}`);
                }
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map