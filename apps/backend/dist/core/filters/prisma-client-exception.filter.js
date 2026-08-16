"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaClientExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClientExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaClientExceptionFilter = PrismaClientExceptionFilter_1 = class PrismaClientExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(PrismaClientExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const correlationId = request.headers['x-correlation-id'] || 'N/A';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode = 'DATABASE_ERROR';
        let userMessage = 'An unexpected database error occurred.';
        switch (exception.code) {
            case 'P2002': {
                status = common_1.HttpStatus.CONFLICT;
                errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
                const target = exception.meta?.target || [];
                const fieldName = target.length > 0 ? target.join(', ') : 'field';
                userMessage = `A duplicate record already exists with the provided ${fieldName}.`;
                break;
            }
            case 'P2025': {
                status = common_1.HttpStatus.NOT_FOUND;
                errorCode = 'RECORD_NOT_FOUND';
                userMessage = 'The requested database record was not found or has been deleted.';
                break;
            }
            case 'P2003': {
                status = common_1.HttpStatus.BAD_REQUEST;
                errorCode = 'FOREIGN_KEY_VIOLATION';
                userMessage = 'Referenced related record does not exist or cannot be modified.';
                break;
            }
            case 'P2014': {
                status = common_1.HttpStatus.BAD_REQUEST;
                errorCode = 'RELATION_VIOLATION';
                userMessage = 'The requested change violates a required relationship constraint.';
                break;
            }
            default: {
                this.logger.error(`Unhandled Prisma Error [${exception.code}] on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
                break;
            }
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            error: common_1.HttpStatus[status],
            code: errorCode,
            message: userMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
        });
    }
};
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter;
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter = PrismaClientExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(client_1.Prisma.PrismaClientKnownRequestError)
], PrismaClientExceptionFilter);
//# sourceMappingURL=prisma-client-exception.filter.js.map