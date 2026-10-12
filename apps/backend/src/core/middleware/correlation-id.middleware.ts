import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: (err?: any) => void) {
    const headerName = 'x-correlation-id';
    const correlationId = (req.headers?.[headerName] as string) || randomUUID();

    if (req.headers) {
      req.headers[headerName] = correlationId;
    }
    if (typeof res.setHeader === 'function') {
      res.setHeader(headerName, correlationId);
    } else if (typeof res.header === 'function') {
      res.header(headerName, correlationId);
    }

    next();
  }
}
