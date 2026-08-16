import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly SENSITIVE_KEYS;
    private sanitizeData;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
