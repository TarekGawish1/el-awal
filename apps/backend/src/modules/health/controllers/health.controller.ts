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

  private lastHealthCheck: { time: number; result: any } | null = null;

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness and readiness healthcheck probe' })
  async check() {
    const now = Date.now();
    if (this.lastHealthCheck && now - this.lastHealthCheck.time < 3000) {
      return this.lastHealthCheck.result;
    }
    const result = await this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma, { timeout: 15000 }),
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024), // 1GB heap limit
    ]);
    this.lastHealthCheck = { time: now, result };
    return result;
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Deployment pipeline test ping' })
  ping() {
    return {
      status: 'ok',
      message: '🚀 CI/CD deployment pipeline is working perfectly!',
      timestamp: new Date().toISOString(),
      server: '(Ubuntu 22.04 LTS)',
      environment: process.env.NODE_ENV || 'production',
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'API Version & Live Pipeline Verification' })
  getVersion() {
    return {
      appName: 'El-Awal Educational Backend',
      version: '1.0.1',
      deployedAt: new Date().toISOString(),
      status: 'Automated CI/CD is working seamlessly! 🎉',
      server: '(Ubuntu 22.04 LTS)',
    };      
  }

  @Public()
  @Get('ci-test')
  @ApiOperation({ summary: 'CI/CD pipeline automated test verification' })
  ciTest() {
    return {
      status: 'success',
      pipeline: 'GitHub Actions -> Heroku Git Subtree',
      deployedAt: new Date().toISOString(),
      message: '🎉 GitHub Actions CI/CD deployment pipeline pushed and updated the server automatically!',
    };
  }
}
