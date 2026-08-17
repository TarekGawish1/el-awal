import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_TRAFFIC');

  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'confirmpassword',
    'passwordhash',
    'token',
    'refreshtoken',
    'accesstoken',
    'qrcodetoken',
    'tokenhash',
    'secret',
    'secretkey',
    'apikey',
    'authorization',
    'cookie',
    'creditcard',
    'cvv',
  ]);

  /**
   * Recursively sanitizes request/response bodies by masking sensitive fields.
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '******** [REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, query, body } = req;
    const correlationId = (req.headers['x-correlation-id'] as string) || 'N/A';
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const user = (req as any).user;
    const userContext = user
      ? `[User: ${user.fullName || user.id} (${user.role})]`
      : '[Public / Anonymous]';

    const startTime = Date.now();

    // 1. Log Incoming Request
    const sanitizedBody =
      body && Object.keys(body).length > 0
        ? JSON.stringify(this.sanitizeData(body))
        : null;
    const sanitizedQuery =
      query && Object.keys(query).length > 0
        ? JSON.stringify(this.sanitizeData(query))
        : null;
    const queryStr = sanitizedQuery ? ` | Query: ${sanitizedQuery}` : '';
    const bodyStr = sanitizedBody ? ` | Body: ${sanitizedBody}` : '';

    this.logger.log(
      `--> [REQ] [${correlationId}] ${method} ${originalUrl}${queryStr}${bodyStr} | IP: ${clientIp} | ${userContext} | UA: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          // Estimate response payload length
          let payloadSummary = '';
          if (responseBody) {
            if (responseBody.data && Array.isArray(responseBody.data)) {
              payloadSummary = ` | Items: ${responseBody.data.length}`;
            } else if (typeof responseBody === 'object') {
              payloadSummary = ` | Response: OK`;
            }
          }

          this.logger.log(
            `<-- [RES] [${correlationId}] ${method} ${originalUrl} ${statusCode} +${duration}ms${payloadSummary} | ${userContext}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err?.status || err?.statusCode || 500;
          const errMessage = err?.message || 'Internal server error';

          if (status >= 500) {
            this.logger.error(
              `<-- [ERR] [${correlationId}] ${method} ${originalUrl} ${status} +${duration}ms | ${userContext} | Error: ${errMessage}`,
              err?.stack,
            );
          } else {
            this.logger.warn(
              `<-- [WARN] [${correlationId}] ${method} ${originalUrl} ${status} +${duration}ms | ${userContext} | Reason: ${errMessage}`,
            );
          }
        },
      }),
    );
  }
}
