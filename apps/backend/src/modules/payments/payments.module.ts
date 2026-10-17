import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentBillingConfigService } from './services/payment-billing-config.service';
import { PaymentMatrixLedgerService } from './services/payment-matrix-ledger.service';
import { PaymentAnalyticsService } from './services/payment-analytics.service';
import { PaymentFinanceInitService } from './services/payment-finance-init.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentBillingConfigService,
    PaymentMatrixLedgerService,
    PaymentAnalyticsService,
    PaymentFinanceInitService,
  ],
  exports: [
    PaymentsService,
    PaymentBillingConfigService,
    PaymentMatrixLedgerService,
    PaymentAnalyticsService,
    PaymentFinanceInitService,
  ],
})
export class PaymentsModule {}
