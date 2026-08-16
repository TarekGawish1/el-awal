"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const correlationId = request.headers['x-correlation-id'] || 'N/A';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let errorName = 'Internal Server Error';
        let message = 'An internal server error occurred.';
        let errorCode = 'INTERNAL_ERROR';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            errorName = common_1.HttpStatus[status] || 'Http Exception';
            if (typeof res === 'object' && res !== null) {
                message = res.message || exception.message;
                errorCode = res.code || res.error || `HTTP_${status}`;
            }
            else if (typeof res === 'string') {
                message = res;
                errorCode = `HTTP_${status}`;
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(`💥 Unhandled System Exception on ${request.method} ${request.url} [CID: ${correlationId}]: ${exception.message}`, exception.stack);
            if (process.env.NODE_ENV === 'development') {
                message = exception.message;
            }
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            error: errorName,
            code: errorCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map