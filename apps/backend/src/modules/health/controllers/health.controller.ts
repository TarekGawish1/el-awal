import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../../core/database/prisma.service';
import { Public } from '../../../core/security/decorators/public.decorator';

@ApiTags('Health & Telemetry')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness and readiness healthcheck probe' })
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB heap limit
    ]);
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Deployment pipeline test ping' })
  ping() {
    return {
      status: 'ok',
      message: '🚀 CI/CD deployment pipeline is working perfectly!',
      timestamp: new Date().toISOString(),
      server: 'DigitalOcean VPS',
      environment: process.env.NODE_ENV || 'production',
    };
  }
}
