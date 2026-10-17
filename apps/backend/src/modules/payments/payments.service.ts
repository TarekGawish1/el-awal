import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../../core/security/decorators/current-user.decorator';
import { MatrixLedgerQueryDto } from './dto/matrix-ledger-query.dto';
import { FinanceAnalyticsQueryDto } from './dto/finance-analytics-query.dto';
import { PaymentBillingConfigService } from './services/payment-billing-config.service';
import { PaymentMatrixLedgerService } from './services/payment-matrix-ledger.service';
import { PaymentAnalyticsService } from './services/payment-analytics.service';
import { GroupFinancialMetricsParams } from './services/payment-group-metrics';

@Injectable()
export class PaymentsService {
  private readonly billingConfigService: PaymentBillingConfigService;
  private readonly matrixLedgerService: PaymentMatrixLedgerService;
  private readonly analyticsService: PaymentAnalyticsService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() billingConfigService?: PaymentBillingConfigService,
    @Optional() matrixLedgerService?: PaymentMatrixLedgerService,
    @Optional() analyticsService?: PaymentAnalyticsService,
  ) {
    this.billingConfigService = billingConfigService ?? new PaymentBillingConfigService(prisma);
    this.matrixLedgerService = matrixLedgerService ?? new PaymentMatrixLedgerService(prisma, this.billingConfigService);
    this.analyticsService = analyticsService ?? new PaymentAnalyticsService(prisma, this.billingConfigService);
  }

  // --- Billing Configuration & Period Methods ---
  parsePeriod(query: MatrixLedgerQueryDto) {
    return this.billingConfigService.parsePeriod(query);
  }

  resolveTeacherId(user: AuthenticatedUser) {
    return this.billingConfigService.resolveTeacherId(user);
  }

  parseBillingConfig(value: unknown, availableMonths: number[]) {
    return this.billingConfigService.parseBillingConfig(value, availableMonths);
  }

  normalizeExcludedMonths(value: unknown, availableMonths: number[]) {
    return this.billingConfigService.normalizeExcludedMonths(value, availableMonths);
  }

  isMonthStarted(
    academicYear: string,
    academicTerm: string,
    month: number,
    paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID',
  ) {
    return this.billingConfigService.isMonthStarted(academicYear, academicTerm, month, paymentTiming);
  }

  inferStage(gradeLevel: string): string {
    return this.billingConfigService.inferStage(gradeLevel);
  }

  async getBillingConfiguration(user: AuthenticatedUser, academicYear?: string, academicTerm?: string) {
    return this.billingConfigService.getBillingConfiguration(user, academicYear, academicTerm);
  }

  async updateBillingConfiguration(
    user: AuthenticatedUser,
    dto: { academicYear: string; academicTerm: string; excludedMonths: number[]; paymentTiming?: 'PREPAID' | 'POSTPAID' },
  ) {
    return this.billingConfigService.updateBillingConfiguration(user, dto);
  }

  // --- Matrix Ledger ---
  async getMatrixLedger(user: AuthenticatedUser, query: MatrixLedgerQueryDto) {
    return this.matrixLedgerService.getMatrixLedger(user, query);
  }

  // --- Analytics & Dashboard ---
  calculateGroupFinancialMetrics(params: Omit<GroupFinancialMetricsParams, 'inferStage'>) {
    return this.analyticsService.calculateGroupFinancialMetrics(params);
  }

  async getFinanceAnalytics(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto) {
    return this.analyticsService.getFinanceAnalytics(user, query);
  }

  async getDashboardAnalytics(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto & { month?: number | string }) {
    return this.analyticsService.getDashboardAnalytics(user, query);
  }

  async getFinanceInit(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto & { month?: number | string }) {
    return this.analyticsService.getFinanceInit(user, query);
  }
}
