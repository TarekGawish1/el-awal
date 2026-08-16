import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] || 'N/A';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message: string | string[] = 'An internal server error occurred.';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      errorName = HttpStatus[status] || 'Http Exception';

      if (typeof res === 'object' && res !== null) {
        message = res.message || exception.message;
        errorCode = res.code || res.error || `HTTP_${status}`;
      } else if (typeof res === 'string') {
        message = res;
        errorCode = `HTTP_${status}`;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `💥 Unhandled System Exception on ${request.method} ${request.url} [CID: ${correlationId}]: ${exception.message}`,
        exception.stack,
      );
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
}
