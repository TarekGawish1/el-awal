import { Module } from '@nestjs/common';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionBillingService } from './services/subscription-billing.service';
import { SubscriptionQrService } from './services/subscription-qr.service';
import { SubscriptionLedgerService } from './services/subscription-ledger.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionBillingService,
    SubscriptionQrService,
    SubscriptionLedgerService,
    SubscriptionsService,
  ],
  exports: [
    SubscriptionBillingService,
    SubscriptionQrService,
    SubscriptionLedgerService,
    SubscriptionsService,
  ],
})
export class SubscriptionsModule {}
