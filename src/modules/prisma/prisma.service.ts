import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('Connecting to Neon PostgreSQL Cloud Database...');
    await this.$connect();
    this.logger.log('Database connection successfully established.');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from Database...');
    await this.$disconnect();
  }
}
