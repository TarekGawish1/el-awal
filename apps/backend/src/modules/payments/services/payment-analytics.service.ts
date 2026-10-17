import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { CourseEnrollmentStatus, GroupEnrollmentStatus, PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { FinanceAnalyticsQueryDto } from '../dto/finance-analytics-query.dto';
import { MatrixLedgerQueryDto } from '../dto/matrix-ledger-query.dto';
import { PaymentBillingConfigService, STAGE_GRADE_LEVELS, round2, rate } from './payment-billing-config.service';
import { calculateGroupFinancialMetrics, GroupFinancialMetricsParams } from './payment-group-metrics';
import { PaymentFinanceInitService } from './payment-finance-init.service';

@Injectable()
export class PaymentAnalyticsService {
  private readonly financeInitService: PaymentFinanceInitService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingConfigService: PaymentBillingConfigService,
    @Optional() financeInitService?: PaymentFinanceInitService,
  ) {
    this.financeInitService =
      financeInitService ?? new PaymentFinanceInitService(this.prisma, this.billingConfigService);
  }

  calculateGroupFinancialMetrics(params: Omit<GroupFinancialMetricsParams, 'inferStage'>) {
    return calculateGroupFinancialMetrics({
      ...params,
      inferStage: (grade) => this.billingConfigService.inferStage(grade),
    });
  }

  async getFinanceAnalytics(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial analytics');
    }

    const { academicYear, academicTerm, availableMonths } =
      this.billingConfigService.parsePeriod(query as MatrixLedgerQueryDto);
    const teacherId = await this.billingConfigService.resolveTeacherId(user);
    const billingConfiguration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear, academicTerm } },
        })
      : null;
    const { excludedMonths } = this.billingConfigService.parseBillingConfig(
      billingConfiguration?.excludedMonths,
      availableMonths,
    );
    const months = availableMonths.filter((month) => !excludedMonths.includes(month));

    const requestedMonth = Number(query.periodMonth) || 0;
    const isMonthScope =
      requestedMonth >= 1 && requestedMonth <= 12 && availableMonths.includes(requestedMonth) && !excludedMonths.includes(requestedMonth);
    const billingMonths = isMonthScope ? [requestedMonth] : months;

    const stageGrades = query.stage && query.stage !== 'ALL' ? STAGE_GRADE_LEVELS[query.stage] || [] : [];
    let gradeLevelFilter: any;
    if (query.gradeLevel && query.gradeLevel !== 'ALL') {
      gradeLevelFilter = query.gradeLevel;
    } else if (stageGrades.length > 0) {
      gradeLevelFilter = { in: stageGrades };
    }

    const groupWhere: any = {
      isActive: true,
      academicYear,
      academicTerm,
      ...(teacherId ? { teacherId } : {}),
      ...(query.groupId ? { id: query.groupId } : {}),
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
    };

    const studentWhere: any = {
      academicStatus: 'ACTIVE',
      user: { isActive: true },
      groupEnrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, group: groupWhere } },
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
    };

    const [groups, students, booklets] = await Promise.all([
      this.prisma.academicGroup.findMany({
        where: groupWhere,
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, gradeLevel: true, monthlyFee: true },
      }),
      this.prisma.studentProfile.findMany({
        where: studentWhere,
        select: {
          id: true,
          gradeLevel: true,
          groupEnrollments: {
            where: { status: GroupEnrollmentStatus.ACTIVE, group: groupWhere },
            select: { groupId: true, enrolledAt: true },
          },
        },
      }),
      this.prisma.booklet.findMany({
        where: {
          isActive: true,
          academicYear,
          academicTerm,
          ...(teacherId ? { teacherProfileId: teacherId } : {}),
          ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
          ...(query.groupId ? { OR: [{ groupId: null }, { groupId: query.groupId }] } : {}),
        },
        select: { id: true, title: true, price: true, gradeLevel: true, groupId: true },
      }),
    ]);

    const studentIds = students.map((student) => student.id);
    const payments =
      studentIds.length === 0
        ? []
        : await this.prisma.studentPaymentRecord.findMany({
            where: {
              studentId: { in: studentIds },
              paymentType: { in: [PaymentType.TUITION, PaymentType.BOOKLET] },
              paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.EXEMPT] },
            },
            select: {
              studentId: true,
              groupId: true,
              bookletId: true,
              paymentType: true,
              periodYear: true,
              periodMonth: true,
              amountPaid: true,
              paymentStatus: true,
            },
          });

    const metrics = this.calculateGroupFinancialMetrics({
      groups,
      students,
      booklets,
      payments,
      billingMonths,
      isMonthScope,
      requestedMonth,
      academicYear,
      useSubscriptionKey: false,
    });

    return {
      academicYear,
      academicTerm,
      months: billingMonths,
      periodMonth: isMonthScope ? requestedMonth : null,
      scope: isMonthScope ? 'MONTH' : 'TERM',
      overview: {
        totalExpected: metrics.overviewTotalExpected,
        totalCollected: metrics.overviewTotalCollected,
        totalRemaining: Math.max(0, round2(metrics.overviewTotalExpected - metrics.overviewTotalCollected)),
        collectionRate: rate(metrics.overviewTotalCollected, metrics.overviewTotalExpected),
        totalStudents: students.length,
        tuition: {
          expected: metrics.overviewTuitionExpected,
          collected: metrics.overviewTuitionCollected,
          remaining: Math.max(0, round2(metrics.overviewTuitionExpected - metrics.overviewTuitionCollected)),
          collectionRate: rate(metrics.overviewTuitionCollected, metrics.overviewTuitionExpected),
        },
        booklets: {
          expected: metrics.overviewBookletsExpected,
          collected: metrics.overviewBookletsCollected,
          remaining: Math.max(0, round2(metrics.overviewBookletsExpected - metrics.overviewBookletsCollected)),
          collectionRate: rate(metrics.overviewBookletsCollected, metrics.overviewBookletsExpected),
        },
      },
      groups: metrics.groupRows,
    };
  }

  async getDashboardAnalytics(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto & { month?: number | string }) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial analytics');
    }

    const { academicYear, academicTerm, availableMonths } =
      this.billingConfigService.parsePeriod(query as MatrixLedgerQueryDto);
    const teacherId = await this.billingConfigService.resolveTeacherId(user);
    const billingConfiguration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear, academicTerm } },
        })
      : null;
    const { excludedMonths } = this.billingConfigService.parseBillingConfig(
      billingConfiguration?.excludedMonths,
      availableMonths,
    );
    const months = availableMonths.filter((month) => !excludedMonths.includes(month));

    const requestedMonth = Number(query.month || query.periodMonth) || 0;
    const isMonthScope =
      requestedMonth >= 1 && requestedMonth <= 12 && availableMonths.includes(requestedMonth) && !excludedMonths.includes(requestedMonth);
    const billingMonths = isMonthScope ? [requestedMonth] : months;

    const stageGrades = query.stage && query.stage !== 'ALL' ? STAGE_GRADE_LEVELS[query.stage] || [] : [];
    let gradeLevelFilter: any;
    if (query.gradeLevel && query.gradeLevel !== 'ALL') {
      gradeLevelFilter = query.gradeLevel;
    } else if (stageGrades.length > 0) {
      gradeLevelFilter = { in: stageGrades };
    }

    const groupWhere: any = {
      isActive: true,
      academicYear,
      academicTerm,
      ...(teacherId ? { teacherId } : {}),
      ...(query.groupId ? { id: query.groupId } : {}),
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
    };

    const studentWhere: any = {
      academicStatus: 'ACTIVE',
      user: { isActive: true },
      groupEnrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, group: groupWhere } },
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
    };

    const bookletWhere: any = {
      isActive: true,
      academicYear,
      academicTerm,
      ...(teacherId ? { teacherProfileId: teacherId } : {}),
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
      ...(query.groupId ? { OR: [{ groupId: null }, { groupId: query.groupId }] } : {}),
    };

    const courseWhere: any = {
      ...(teacherId ? { teacherId } : {}),
      ...(gradeLevelFilter ? { gradeLevel: gradeLevelFilter } : {}),
      ...(academicYear ? { OR: [{ academicYear }, { academicYear: null }] } : {}),
    };

    const [groups, students, booklets, courses] = await Promise.all([
      this.prisma.academicGroup.findMany({
        where: groupWhere,
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, gradeLevel: true, monthlyFee: true },
      }),
      this.prisma.studentProfile.findMany({
        where: studentWhere,
        select: {
          id: true,
          gradeLevel: true,
          groupEnrollments: {
            where: { status: GroupEnrollmentStatus.ACTIVE, group: groupWhere },
            select: { groupId: true, enrolledAt: true },
          },
        },
      }),
      this.prisma.booklet.findMany({
        where: bookletWhere,
        select: { id: true, title: true, price: true, gradeLevel: true, groupId: true },
      }),
      this.prisma.course.findMany({
        where: courseWhere,
        include: {
          enrollments: {
            select: {
              id: true,
              status: true,
              transferAmount: true,
              enrolledAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const studentIds = students.map((student) => student.id);
    const payments =
      studentIds.length === 0
        ? []
        : await this.prisma.studentPaymentRecord.findMany({
            where: {
              studentId: { in: studentIds },
              paymentType: { in: [PaymentType.TUITION, PaymentType.BOOKLET] },
              paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.EXEMPT] },
            },
            select: {
              studentId: true,
              groupId: true,
              bookletId: true,
              paymentType: true,
              periodYear: true,
              periodMonth: true,
              amountPaid: true,
              paymentStatus: true,
            },
          });

    const metrics = this.calculateGroupFinancialMetrics({
      groups,
      students,
      booklets,
      payments,
      billingMonths,
      isMonthScope,
      requestedMonth,
      academicYear,
      useSubscriptionKey: true,
    });
    const groupRows = metrics.groupRows;

    let totalCoursesExpected = 0;
    let totalCoursesCollected = 0;

    const courseRows = courses.map((course) => {
      const price = Number(course.price || 0);
      const enrollments = course.enrollments || [];

      const filteredEnrollments = isMonthScope
        ? enrollments.filter((e) => {
            const d = new Date(e.enrolledAt);
            return d.getMonth() + 1 === requestedMonth;
          })
        : enrollments;

      const activeEnrollments = filteredEnrollments.filter((e) => e.status === CourseEnrollmentStatus.ACTIVE);
      const pendingEnrollments = filteredEnrollments.filter((e) => e.status === CourseEnrollmentStatus.PENDING);

      const enrolledStudents = activeEnrollments.length;
      const collected = activeEnrollments.reduce((sum, e) => {
        const paid = e.transferAmount != null ? Number(e.transferAmount) : price;
        return sum + paid;
      }, 0);

      const expected = round2(collected + pendingEnrollments.length * price);

      totalCoursesExpected += expected;
      totalCoursesCollected += collected;

      return {
        id: course.id,
        title: course.title,
        price,
        enrolledStudents,
        totalCollected: round2(collected),
        gradeLevel: course.gradeLevel,
      };
    });

    const overviewSubscriptionsExpected = metrics.overviewTuitionExpected;
    const overviewSubscriptionsCollected = metrics.overviewTuitionCollected;
    const overviewSubscriptionsRemaining = Math.max(0, round2(overviewSubscriptionsExpected - overviewSubscriptionsCollected));
    const overviewSubscriptionsRate = rate(overviewSubscriptionsCollected, overviewSubscriptionsExpected);

    const overviewBookletsExpected = metrics.overviewBookletsExpected;
    const overviewBookletsCollected = metrics.overviewBookletsCollected;
    const overviewBookletsRemaining = Math.max(0, round2(overviewBookletsExpected - overviewBookletsCollected));
    const overviewBookletsRate = rate(overviewBookletsCollected, overviewBookletsExpected);

    const overviewOnlineCoursesExpected = round2(totalCoursesExpected);
    const overviewOnlineCoursesCollected = round2(totalCoursesCollected);
    const overviewOnlineCoursesRemaining = Math.max(0, round2(overviewOnlineCoursesExpected - overviewOnlineCoursesCollected));
    const overviewOnlineCoursesRate = rate(overviewOnlineCoursesCollected, overviewOnlineCoursesExpected);

    const grandTotalExpected = round2(overviewSubscriptionsExpected + overviewBookletsExpected + overviewOnlineCoursesExpected);
    const grandTotalCollected = round2(overviewSubscriptionsCollected + overviewBookletsCollected + overviewOnlineCoursesCollected);
    const grandTotalRemaining = Math.max(0, round2(grandTotalExpected - grandTotalCollected));
    const grandTotalRate = rate(grandTotalCollected, grandTotalExpected);

    return {
      overview: {
        grandTotal: {
          expected: grandTotalExpected,
          collected: grandTotalCollected,
          remaining: grandTotalRemaining,
          rate: grandTotalRate,
        },
        subscriptions: {
          expected: overviewSubscriptionsExpected,
          collected: overviewSubscriptionsCollected,
          remaining: overviewSubscriptionsRemaining,
          rate: overviewSubscriptionsRate,
        },
        booklets: {
          expected: overviewBookletsExpected,
          collected: overviewBookletsCollected,
          remaining: overviewBookletsRemaining,
          rate: overviewBookletsRate,
        },
        onlineCourses: {
          expected: overviewOnlineCoursesExpected,
          collected: overviewOnlineCoursesCollected,
          remaining: overviewOnlineCoursesRemaining,
          rate: overviewOnlineCoursesRate,
        },
      },
      groups: groupRows,
      onlineCourses: courseRows,
    };
  }

  async getFinanceInit(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto & { month?: number | string }) {
    const analytics = await this.getDashboardAnalytics(user, query);
    return this.financeInitService.getFinanceInit(user, query, analytics);
  }
}
