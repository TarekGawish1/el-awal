import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { PaymentStatus, PaymentType } from "@prisma/client";

export interface FinancialOverviewResponse {
  totalRevenue: number;
  tuitionRevenue: number;
  bookletRevenue: number;
  pendingAmount: number;
  totalTransactions: number;
  paidTransactions: number;
}

export interface MonthlyRevenueItem {
  month: number;
  year: number;
  label: string;
  totalCollected: number;
  tuitionCollected: number;
  bookletCollected: number;
}

@Injectable()
export class FinancialAnalyticsService {
  private readonly logger = new Logger(FinancialAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getFinancialOverview(
    teacherId?: string,
    periodYear?: number,
  ): Promise<FinancialOverviewResponse> {
    const year = periodYear || new Date().getFullYear();
    const where: any = {
      periodYear: year,
      ...(teacherId
        ? {
            group: {
              OR: [{ teacherId }, { teacher: { id: teacherId } }],
            },
          }
        : {}),
    };

    const payments = await this.prisma.studentPaymentRecord.findMany({
      where,
      select: {
        amountPaid: true,
        amountExpected: true,
        paymentStatus: true,
        paymentType: true,
      },
      take: 20000,
    });

    let totalRevenue = 0;
    let tuitionRevenue = 0;
    let bookletRevenue = 0;
    let pendingAmount = 0;
    let paidTransactions = 0;

    for (const p of payments) {
      const paid = Number(p.amountPaid || 0);
      const expected = Number(p.amountExpected || 0);

      if (p.paymentStatus === PaymentStatus.PAID) {
        totalRevenue += paid;
        paidTransactions++;
        if (p.paymentType === PaymentType.BOOKLET) {
          bookletRevenue += paid;
        } else {
          tuitionRevenue += paid;
        }
      } else {
        totalRevenue += paid;
        if (expected > paid) {
          pendingAmount += expected - paid;
        }
      }
    }

    return {
      totalRevenue,
      tuitionRevenue,
      bookletRevenue,
      pendingAmount,
      totalTransactions: payments.length,
      paidTransactions,
    };
  }

  public async getMonthlyRevenueTrend(
    teacherId?: string,
    year: number = new Date().getFullYear(),
  ): Promise<MonthlyRevenueItem[]> {
    const payments = await this.prisma.studentPaymentRecord.findMany({
      where: {
        periodYear: year,
        paymentStatus: PaymentStatus.PAID,
        ...(teacherId
          ? {
              group: {
                OR: [{ teacherId }, { teacher: { id: teacherId } }],
              },
            }
          : {}),
      },
      select: {
        periodMonth: true,
        amountPaid: true,
        paymentType: true,
      },
    });

    const monthMap = new Map<number, { tuition: number; booklet: number }>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { tuition: 0, booklet: 0 });
    }

    for (const p of payments) {
      const m = p.periodMonth;
      if (m && monthMap.has(m)) {
        const entry = monthMap.get(m)!;
        const amt = Number(p.amountPaid || 0);
        if (p.paymentType === PaymentType.BOOKLET) {
          entry.booklet += amt;
        } else {
          entry.tuition += amt;
        }
      }
    }

    const MONTH_NAMES_AR = [
      "يناير",
      "فبراير",
      "مارس",
      "إبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];

    return Array.from(monthMap.entries()).map(([m, val]) => ({
      month: m,
      year,
      label: MONTH_NAMES_AR[m - 1] || `${m}`,
      totalCollected: val.tuition + val.booklet,
      tuitionCollected: val.tuition,
      bookletCollected: val.booklet,
    }));
  }

  public async getPaymentMethodsBreakdown(teacherId?: string) {
    const payments = await this.prisma.studentPaymentRecord.findMany({
      where: {
        ...(teacherId
          ? {
              group: {
                OR: [{ teacherId }, { teacher: { id: teacherId } }],
              },
            }
          : {}),
      },
      select: {
        paymentMethod: true,
        amountPaid: true,
      },
    });

    const counts: Record<string, { count: number; totalAmount: number }> = {};
    for (const p of payments) {
      const method = p.paymentMethod || "CASH";
      if (!counts[method]) {
        counts[method] = { count: 0, totalAmount: 0 };
      }
      counts[method].count++;
      counts[method].totalAmount += Number(p.amountPaid || 0);
    }

    return Object.entries(counts).map(([method, data]) => ({
      method,
      count: data.count,
      totalAmount: data.totalAmount,
    }));
  }
}
