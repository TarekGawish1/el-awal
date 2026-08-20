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
  private readonly logger = new Logger('HTTP');

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
      return data.slice(0, 5).map((item) => this.sanitizeData(item));
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

  /**
   * Formats a concise summary of the request body for mutation requests.
   */
  private formatBodySummary(body: any): string {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return '';
    }
    try {
      const sanitized = this.sanitizeData(body);
      const str = JSON.stringify(sanitized);
      // Truncate long bodies to keep logs clean
      const truncated = str.length > 120 ? `${str.slice(0, 117)}...}` : str;
      return ` | Body: ${truncated}`;
    } catch {
      return '';
    }
  }

  /**
   * Formats a clean, readable user context string.
   */
  private formatUserContext(user: any): string {
    if (!user) return '[Anon]';
    const identifier = user.fullName || user.email || (user.id ? `${user.id.slice(0, 8)}...` : 'User');
    const role = user.role ? ` (${user.role})` : '';
    return `[${identifier}${role}]`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, body } = req;

    // Skip noisy OPTIONS preflight requests in application logs
    if (method === 'OPTIONS') {
      return next.handle();
    }

    const startTime = Date.now();
    const user = (req as any).user;
    const userContext = this.formatUserContext(user);
    const bodySummary = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ? this.formatBodySummary(body)
      : '';

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          let payloadHint = '';
          if (responseBody?.data && Array.isArray(responseBody.data)) {
            payloadHint = ` (${responseBody.data.length} items)`;
          }

          this.logger.log(
            `${method} ${originalUrl} ${statusCode} (${duration}ms)${payloadHint} ${userContext}${bodySummary}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err?.status || err?.statusCode || 500;
          const errMessage = err?.message || 'Internal server error';

          if (status >= 500) {
            this.logger.error(
              `${method} ${originalUrl} ${status} (${duration}ms) ${userContext} | 💥 Error: ${errMessage}`,
              err?.stack,
            );
          } else {
            this.logger.warn(
              `${method} ${originalUrl} ${status} (${duration}ms) ${userContext} | ⚠️ Reason: ${errMessage}`,
            );
          }
        },
      }),
    );
  }
}
