import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const isProd = process.env.NODE_ENV === 'production';
    const bypassHeader = req.headers?.['x-load-test-bypass'];
    const configuredSecret = process.env.LOAD_TEST_BYPASS_SECRET;

    // Secure timing-safe verification if LOAD_TEST_BYPASS_SECRET is explicitly configured
    if (typeof bypassHeader === 'string' && configuredSecret && configuredSecret.length > 0) {
      if (constantTimeCompare(bypassHeader, configuredSecret)) {
        return true;
      }
    }

    // In production, hardcoded fallback secrets and blind flags are STRICTLY PROHIBITED
    if (!isProd) {
      if (
        process.env.LOAD_TEST_BYPASS === 'true' ||
        (typeof bypassHeader === 'string' &&
          constantTimeCompare(bypassHeader, 'el-awal-load-test-2026'))
      ) {
        return true;
      }
    }

    return super.canActivate(context);
  }
}
