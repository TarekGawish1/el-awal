import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { FinanceAnalyticsQueryDto } from '../dto/finance-analytics-query.dto';
import { MatrixLedgerQueryDto } from '../dto/matrix-ledger-query.dto';
import { PaymentBillingConfigService, STAGE_GRADE_LEVELS } from './payment-billing-config.service';

@Injectable()
export class PaymentFinanceInitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingConfigService: PaymentBillingConfigService,
  ) {}

  async getFinanceInit(
    user: AuthenticatedUser,
    query: FinanceAnalyticsQueryDto & { month?: number | string },
    analytics: any,
  ) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial analytics');
    }

    const { academicYear, academicTerm } =
      this.billingConfigService.parsePeriod(query as MatrixLedgerQueryDto);
    const teacherId = await this.billingConfigService.resolveTeacherId(user);

    const [rawGroups, booklets] = await Promise.all([
      this.prisma.academicGroup.findMany({
        where: {
          isActive: true,
          academicYear,
          academicTerm,
          ...(teacherId ? { teacherId } : {}),
        },
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          monthlyFee: true,
          academicYear: true,
          academicTerm: true,
          _count: {
            select: {
              enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.booklet.findMany({
        where: {
          isActive: true,
          academicYear,
          academicTerm,
          ...(teacherId ? { teacherProfileId: teacherId } : {}),
        },
        select: {
          id: true,
          title: true,
          price: true,
          gradeLevel: true,
          groupId: true,
          academicYear: true,
          academicTerm: true,
        },
        orderBy: { title: 'asc' },
      }),
    ]);

    const groups = rawGroups.map((g) => ({
      ...g,
      stage: this.billingConfigService.inferStage(g.gradeLevel),
      monthlyFee: Number(g.monthlyFee),
    }));

    return {
      analytics,
      menus: {
        groups,
        booklets: booklets.map((b) => ({
          ...b,
          price: Number(b.price),
        })),
        academicPeriod: {
          activeAcademicYear: academicYear,
          activeAcademicTerm: academicTerm,
        },
        stages: STAGE_GRADE_LEVELS,
      },
    };
  }
}
