import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();
    const correlationId = request?.headers?.['x-correlation-id'] || 'N/A';
    const requestUrl = request?.url || request?.originalUrl || '';
    const requestMethod = request?.method || 'UNKNOWN';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message: string | string[] = 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً.';
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
        `💥 Unhandled System Exception on ${requestMethod} ${requestUrl} [CID: ${correlationId}]: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    }

    const payload = {
      success: false,
      statusCode: status,
      error: errorName,
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: requestUrl,
      correlationId,
    };

    if (typeof response.status === 'function' && typeof response.send === 'function') {
      return response.status(status).send(payload);
    }
    if (typeof response.code === 'function' && typeof response.send === 'function') {
      return response.code(status).send(payload);
    }
    if (typeof response.status === 'function' && typeof response.json === 'function') {
      return response.status(status).json(payload);
    }
    return response.send ? response.send(payload) : response.end?.(JSON.stringify(payload));
  }
}
