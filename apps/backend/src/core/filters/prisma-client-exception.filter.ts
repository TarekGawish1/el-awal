import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] || 'N/A';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'DATABASE_ERROR';
    let userMessage = 'An unexpected database error occurred.';

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
        const target = (exception.meta?.target as string[]) || [];
        const fieldName = target.length > 0 ? target.join(', ') : 'field';
        userMessage = `A duplicate record already exists with the provided ${fieldName}.`;
        break;
      }
      case 'P2025': {
        // Record not found
        status = HttpStatus.NOT_FOUND;
        errorCode = 'RECORD_NOT_FOUND';
        userMessage = 'The requested database record was not found or has been deleted.';
        break;
      }
      case 'P2003': {
        // Foreign key constraint failure
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'FOREIGN_KEY_VIOLATION';
        userMessage = 'Referenced related record does not exist or cannot be modified.';
        break;
      }
      case 'P2014': {
        // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'RELATION_VIOLATION';
        userMessage = 'The requested change violates a required relationship constraint.';
        break;
      }
      default: {
        this.logger.error(
          `Unhandled Prisma Error [${exception.code}] on ${request.method} ${request.url}: ${exception.message}`,
          exception.stack,
        );
        break;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: HttpStatus[status],
      code: errorCode,
      message: userMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
