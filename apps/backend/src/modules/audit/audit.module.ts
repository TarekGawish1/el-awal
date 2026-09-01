import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
