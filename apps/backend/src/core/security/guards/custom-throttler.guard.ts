import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Allow load test bypass via header or env flag to measure true server capacity without rate-limiting distortion
    if (
      process.env.LOAD_TEST_BYPASS === 'true' ||
      req.headers?.['x-load-test-bypass'] === 'el-awal-load-test-2026'
    ) {
      return true;
    }
    return super.canActivate(context);
  }
}
