import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { ScanPaymentQrDto } from '../dto/scan-payment-qr.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { CancelPaymentDto } from '../dto/cancel-payment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { SubscriptionQrService } from './subscription-qr.service';
import { SubscriptionLedgerService } from './subscription-ledger.service';

@Injectable()
export class SubscriptionsService {
  private readonly billingService: SubscriptionBillingService;
  private readonly qrService: SubscriptionQrService;
  private readonly ledgerService: SubscriptionLedgerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() billingService?: SubscriptionBillingService,
    @Optional() qrService?: SubscriptionQrService,
    @Optional() ledgerService?: SubscriptionLedgerService,
  ) {
    this.billingService =
      billingService ??
      new SubscriptionBillingService(this.prisma, this.eventEmitter, this.redisCache);
    this.qrService =
      qrService ??
      new SubscriptionQrService(this.prisma, this.eventEmitter, this.redisCache);
    this.ledgerService =
      ledgerService ?? new SubscriptionLedgerService(this.prisma);
  }

  /**
   * Records or updates a tuition or booklet payment record and dispatches payment event upon success.
   */
  async recordStudentPayment(user: AuthenticatedUser, dto: RecordPaymentDto) {
    return this.billingService.recordStudentPayment(user, dto);
  }

  /**
   * Scans student QR code and automatically records the student tuition or booklet payment.
   */
  async scanPaymentQr(user: AuthenticatedUser, dto: ScanPaymentQrDto) {
    return this.qrService.scanPaymentQr(user, dto);
  }

  /**
   * Keyset cursor-paginated tuition payment audit log with multi-criteria filters.
   */
  async getPaymentLog(query: PaymentQueryDto, user: AuthenticatedUser) {
    return this.ledgerService.getPaymentLog(query, user);
  }

  /**
   * Complete payment and billing history for a student across all groups with IDOR check.
   */
  async getStudentPaymentHistory(studentId: string, user: AuthenticatedUser) {
    return this.ledgerService.getStudentPaymentHistory(studentId, user);
  }

  /**
   * Identifies all active group enrolled students who have NOT paid tuition for given year & month.
   */
  async getGroupDefaulters(
    groupId: string,
    periodYear: number,
    periodMonth: number,
    user: AuthenticatedUser,
  ) {
    return this.ledgerService.getGroupDefaulters(groupId, periodYear, periodMonth, user);
  }

  /**
   * Deletes a payment record completely (e.g. recorded by mistake).
   */
  async deleteStudentPayment(id: string, user: AuthenticatedUser) {
    return this.billingService.deleteStudentPayment(id, user);
  }

  /**
   * Refunds/cancels a recorded payment (e.g. student wanted money back).
   */
  async refundStudentPayment(id: string, dto: CancelPaymentDto, user: AuthenticatedUser) {
    return this.billingService.refundStudentPayment(id, dto, user);
  }
}
