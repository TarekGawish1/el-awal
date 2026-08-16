import { HealthCheckService, MemoryHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../../core/database/prisma.service';
export declare class HealthController {
    private readonly health;
    private readonly memory;
    private readonly prismaIndicator;
    private readonly prisma;
    constructor(health: HealthCheckService, memory: MemoryHealthIndicator, prismaIndicator: PrismaHealthIndicator, prisma: PrismaService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
