import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface ResponseEnvelope<T> {
    success: boolean;
    data: T;
    meta?: Record<string, any>;
    timestamp: string;
}
export declare class TransformResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>>;
}
