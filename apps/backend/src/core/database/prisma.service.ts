import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    let databaseUrl = configService.get<string>('DATABASE_URL') || '';

    // If using Supabase transaction pooler (port 6543 / pooler.supabase.com / pgbouncer),
    // ensure pgbouncer=true is appended so Prisma disables prepared statements
    if (databaseUrl.includes(':6543') || databaseUrl.includes('pooler.supabase.com')) {
      if (!databaseUrl.includes('pgbouncer=true')) {
        const separator = databaseUrl.includes('?') ? '&' : '?';
        databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
      }
      if (!databaseUrl.includes('connection_limit=')) {
        const separator = databaseUrl.includes('?') ? '&' : '?';
        databaseUrl = `${databaseUrl}${separator}connection_limit=15`;
      }
      if (!databaseUrl.includes('pool_timeout=')) {
        const separator = databaseUrl.includes('?') ? '&' : '?';
        databaseUrl = `${databaseUrl}${separator}pool_timeout=20`;
      }
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
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
      // Filter out benign Supabase/PgBouncer/Neon idle connection drops
      if (
        e.message?.includes('kind: Closed') ||
        e.message?.includes('Connection closed') ||
        e.message?.includes('Server closed the connection') ||
        e.message?.includes('Connection reset by peer') ||
        e.message?.includes('terminating connection due to administrator command')
      ) {
        this.logger.debug(
          `[Database Pooler] Inactive idle connection closed by pooler. Prisma will auto-reconnect on demand.`,
        );
        return;
      }
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL Database...');
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ PostgreSQL connection successfully established.');
        break;
      } catch (error) {
        retries--;
        this.logger.warn(`Failed to connect to PostgreSQL database (${retries} retries left): ${error}`);
        if (retries === 0) {
          this.logger.error('❌ Failed to connect to PostgreSQL database after retries:', error);
          throw error;
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "lesson_sessions" ADD COLUMN IF NOT EXISTS "end_time" VARCHAR(10);
      `);
      this.logger.log('✅ Verified/Updated lesson_sessions schema columns.');
    } catch (schemaErr: any) {
      this.logger.warn(`Schema check warning: ${schemaErr?.message || schemaErr}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from PostgreSQL Database...');
    await this.$disconnect();
  }
}
