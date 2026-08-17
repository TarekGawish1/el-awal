import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    // Custom event-based logger that filters harmless serverless idle socket disconnects
    this.$on('info', (e) => {
      this.logger.debug(e.message);
    });

    this.$on('warn', (e) => {
      this.logger.warn(e.message);
    });

    this.$on('error', (e) => {
      // Filter out benign Neon/PgBouncer idle connection drops
      if (
        e.message?.includes('kind: Closed') ||
        e.message?.includes('Connection closed') ||
        e.message?.includes('Server closed the connection')
      ) {
        this.logger.debug(
          `[Neon Serverless] Inactive idle connection closed by pooler. Prisma will auto-reconnect on demand.`,
        );
        return;
      }
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL Database...');
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL connection successfully established.');
    } catch (error) {
      this.logger.error('❌ Failed to connect to PostgreSQL database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from PostgreSQL Database...');
    await this.$disconnect();
  }
}
