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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const correlationId = req.headers['x-correlation-id'] || 'N/A';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          const statusCode = res.statusCode;
          this.logger.log(
            `${method} ${originalUrl} ${statusCode} +${duration}ms [CID: ${correlationId}]`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          const status = err?.status || err?.statusCode || 500;
          this.logger.warn(
            `${method} ${originalUrl} ${status} +${duration}ms [CID: ${correlationId}] - ${err.message}`,
          );
        },
      }),
    );
  }
}
