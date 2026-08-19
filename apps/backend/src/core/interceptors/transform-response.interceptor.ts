import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = serializeBigInt(v);
    }
    return res;
  }
  return obj;
}

export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((res) => {
        const sanitized = serializeBigInt(res);

        // If response already matches standard paginated result structure { data, meta }
        if (sanitized && typeof sanitized === 'object' && 'data' in sanitized && 'meta' in sanitized) {
          return {
            success: true,
            data: sanitized.data,
            meta: sanitized.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: sanitized,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
