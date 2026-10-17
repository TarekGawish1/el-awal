import { ForbiddenException, Injectable } from '@nestjs/common';
import { GroupEnrollmentStatus, PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { MatrixLedgerQueryDto } from '../dto/matrix-ledger-query.dto';
import { calculateProratedTuition } from '../../subscriptions/utils/proration.util';
import { PaymentBillingConfigService } from './payment-billing-config.service';

@Injectable()
export class PaymentMatrixLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingConfigService: PaymentBillingConfigService,
  ) {}

  async getMatrixLedger(user: AuthenticatedUser, query: MatrixLedgerQueryDto) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial matrix ledger');
    }

    const { academicYear, academicTerm, availableMonths, paymentYearForMonth } =
      this.billingConfigService.parsePeriod(query);
    const teacherId = await this.billingConfigService.resolveTeacherId(user);
    const billingConfiguration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear, academicTerm } },
        })
      : null;
    const parsedBilling = this.billingConfigService.parseBillingConfig(billingConfiguration?.excludedMonths, availableMonths);
    const excludedMonths = parsedBilling.excludedMonths;
    const paymentTiming = parsedBilling.paymentTiming;
    const months = availableMonths.filter((month) => !excludedMonths.includes(month));
    const page = query.page || 1;
    const limit = query.limit || 20;
    const groupScope: any = {
      isActive: true,
      academicYear,
      academicTerm,
      ...(query.groupId ? { id: query.groupId } : {}),
      ...(teacherId ? { teacherId } : {}),
    };

    const studentWhere: any = {
      academicStatus: 'ACTIVE',
      user: { isActive: true },
      groupEnrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, group: groupScope } },
    };

    if (query.gradeLevel && query.gradeLevel !== 'ALL') studentWhere.gradeLevel = query.gradeLevel;
    if (query.stage && query.stage !== 'ALL') {
      const stageLabels: Record<string, string> = {
        PRIMARY: 'المرحلة الابتدائية',
        PREPARATORY: 'المرحلة الإعدادية',
        SECONDARY: 'المرحلة الثانوية',
      };
      const stageValues = [query.stage, stageLabels[query.stage]].filter(Boolean);
      studentWhere.academicStage = { in: stageValues };
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      studentWhere.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { studentCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalStudents, students] = await Promise.all([
      this.prisma.studentProfile.count({ where: studentWhere }),
      this.prisma.studentProfile.findMany({
        where: studentWhere,
        orderBy: { user: { fullName: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          studentCode: true,
          createdAt: true,
          user: { select: { fullName: true, phone: true } },
          gradeLevel: true,
          groupEnrollments: {
            where: { status: GroupEnrollmentStatus.ACTIVE, group: groupScope },
            orderBy: { enrolledAt: 'asc' },
            select: {
              groupId: true,
              enrolledAt: true,
              group: { select: { id: true, name: true, monthlyFee: true } },
            },
          },
        },
      }),
    ]);

    const bookletWhere: any = {
      isActive: true,
      academicYear,
      academicTerm,
      ...(teacherId ? { teacherProfileId: teacherId } : {}),
      ...(query.gradeLevel && query.gradeLevel !== 'ALL' ? { gradeLevel: query.gradeLevel } : {}),
      ...(query.groupId ? { OR: [{ groupId: null }, { groupId: query.groupId }] } : {}),
    };

    const booklets = await this.prisma.booklet.findMany({
      where: bookletWhere,
      orderBy: [{ gradeLevel: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, price: true, gradeLevel: true },
    });

    const studentIds = students.map((student) => student.id);
    const groupIds = Array.from(new Set(students.flatMap((student) => student.groupEnrollments.map((enrollment) => enrollment.groupId))));
    const paymentPeriods = months.map((month) => ({ periodYear: paymentYearForMonth(month), periodMonth: month }));
    const allTermPaymentPeriods = availableMonths.map((month) => ({ periodYear: paymentYearForMonth(month), periodMonth: month }));
    const paymentConditions: any[] = [];
    if (groupIds.length > 0 && paymentPeriods.length > 0) {
      paymentConditions.push({
        paymentType: PaymentType.TUITION,
        OR: paymentPeriods,
        AND: {
          OR: [
            { groupId: { in: groupIds } },
            { groupId: null },
          ],
        },
      });
    }
    if (booklets.length > 0 && allTermPaymentPeriods.length > 0) {
      paymentConditions.push({ paymentType: PaymentType.BOOKLET, bookletId: { in: booklets.map((booklet) => booklet.id) }, OR: allTermPaymentPeriods });
    }
    const payments = studentIds.length === 0 || paymentConditions.length === 0
      ? []
      : await this.prisma.studentPaymentRecord.findMany({
          where: {
            studentId: { in: studentIds },
            OR: paymentConditions,
            paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.EXEMPT] },
          },
          select: {
            id: true,
            studentId: true,
            groupId: true,
            bookletId: true,
            paymentType: true,
            periodYear: true,
            periodMonth: true,
            amountExpected: true,
            amountPaid: true,
            paymentStatus: true,
            createdAt: true,
          },
        });

    const paymentMap = new Map<string, { paymentId?: string; amountPaid: number; amountExpected: number; isPaid: boolean; paidAt?: Date }>();
    for (const payment of payments) {
      const key = payment.paymentType === PaymentType.BOOKLET
        ? `${payment.studentId}:BOOKLET:${payment.bookletId}`
        : `${payment.studentId}:TUITION:${payment.periodMonth}:${payment.periodYear}`;
      const previous = paymentMap.get(key);
      const amountPaid = (previous?.amountPaid || 0) + Number(payment.amountPaid || 0);
      const amountExpected = Number(payment.amountExpected || 0);
      const paidAt = !previous?.paidAt || payment.createdAt > previous.paidAt ? payment.createdAt : previous.paidAt;
      paymentMap.set(key, {
        paymentId: payment.id,
        amountPaid,
        amountExpected: Math.max(previous?.amountExpected || 0, amountExpected),
        isPaid: (previous?.isPaid || payment.paymentStatus === PaymentStatus.PAID || payment.paymentStatus === PaymentStatus.EXEMPT) &&
          (payment.paymentStatus === PaymentStatus.PAID || payment.paymentStatus === PaymentStatus.EXEMPT),
        paidAt,
      });
    }

    const resultStudents = students.map((student) => {
      const enrollment = student.groupEnrollments[0];
      const monthlyFee = Number(enrollment?.group.monthlyFee || 0);
      const enrollmentDate = enrollment?.enrolledAt ? new Date(enrollment.enrolledAt) : new Date(student.createdAt);
      const enrollYear = enrollmentDate.getFullYear();
      const enrollMonth = enrollmentDate.getMonth() + 1;

      const monthlyPayments: Record<number, { paymentId?: string; isApplicable?: boolean; isPaid: boolean; isPartiallyPaid: boolean; amountPaid: number; amountExpected: number; remainingAmount: number; paidAt?: Date; isStarted: boolean; calculationReason?: string; rateMultiplier?: number }> = {};
      const bookletPayments: Record<string, { paymentId?: string; isApplicable: boolean; isPaid: boolean; isPartiallyPaid: boolean; amountPaid: number; amountExpected: number; remainingAmount: number; paidAt?: Date }> = {};
      let totalDue = 0;
      let totalPaid = 0;

      for (const month of months) {
        const monthYear = paymentYearForMonth(month);
        const key = `${student.id}:TUITION:${month}:${monthYear}`;
        const payment = paymentMap.get(key);
        const amountPaid = payment?.amountPaid || 0;

        const isBeforeEnrollment = monthYear < enrollYear || (monthYear === enrollYear && month < enrollMonth);
        const isJoiningMonth = monthYear === enrollYear && month === enrollMonth;

        let effectiveFee = monthlyFee;
        let prorationReason: string | undefined = undefined;
        let rateMultiplier = 1.0;

        const hasPayment = Boolean(payment && (payment.isPaid || amountPaid > 0));

        if (isBeforeEnrollment && !hasPayment) {
          effectiveFee = 0;
        } else if (isJoiningMonth) {
          const proration = calculateProratedTuition(monthlyFee, enrollmentDate);
          effectiveFee = proration.expectedAmount;
          prorationReason = proration.calculationReason;
          rateMultiplier = proration.rateMultiplier;
        }

        const isExemptByProration = isJoiningMonth && effectiveFee === 0;
        const isPaid = (isBeforeEnrollment && !hasPayment)
          ? false
          : Boolean((payment && (payment.isPaid || amountPaid >= effectiveFee) && (effectiveFee === 0 || amountPaid > 0)) || (isExemptByProration && !payment));
        const isPartiallyPaid = Boolean((!isBeforeEnrollment || hasPayment) && amountPaid > 0 && amountPaid < effectiveFee);
        const isStarted = this.billingConfigService.isMonthStarted(academicYear, academicTerm, month, paymentTiming);
        const isApplicable = !isBeforeEnrollment || hasPayment;

        monthlyPayments[month] = {
          paymentId: payment?.paymentId,
          isApplicable,
          isPaid,
          isPartiallyPaid,
          amountPaid,
          amountExpected: hasPayment ? Math.max(effectiveFee, amountPaid) : effectiveFee,
          remainingAmount: (isBeforeEnrollment && !hasPayment) ? 0 : Math.max(0, effectiveFee - amountPaid),
          paidAt: payment?.paidAt,
          isStarted,
          calculationReason: prorationReason,
          rateMultiplier,
        };
        totalPaid += amountPaid;
        if (isStarted && (!isBeforeEnrollment || hasPayment)) {
          totalDue += Math.max(0, (hasPayment ? Math.max(effectiveFee, amountPaid) : effectiveFee) - amountPaid);
        }
      }

      for (const booklet of booklets) {
        if (booklet.gradeLevel !== student.gradeLevel) {
          bookletPayments[booklet.id] = { isApplicable: false, isPaid: false, isPartiallyPaid: false, amountPaid: 0, amountExpected: 0, remainingAmount: 0 };
          continue;
        }

        const payment = paymentMap.get(`${student.id}:BOOKLET:${booklet.id}`);
        const price = Number(booklet.price);
        const amountPaid = payment?.amountPaid || 0;
        const isPaid = Boolean(payment && (payment.isPaid || amountPaid >= price) && amountPaid > 0);
        const isPartiallyPaid = Boolean(amountPaid > 0 && amountPaid < price);
        bookletPayments[booklet.id] = {
          paymentId: payment?.paymentId,
          isApplicable: true,
          isPaid,
          isPartiallyPaid,
          amountPaid,
          amountExpected: price,
          remainingAmount: Math.max(0, price - amountPaid),
          paidAt: payment?.paidAt,
        };
        totalPaid += amountPaid;
        if (!isPaid) totalDue += Math.max(0, price - amountPaid);
      }

      return {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        phone: student.user.phone || '',
        gradeLevel: student.gradeLevel,
        groupId: enrollment?.groupId || null,
        groupName: enrollment?.group.name || 'بدون مجموعة',
        monthlyFee,
        monthlyPayments,
        bookletPayments,
        totalPaid,
        totalDue,
      };
    });

    return {
      academicYear,
      academicTerm,
      months,
      availableMonths,
      excludedMonths,
      paymentTiming,
      totalStudents,
      currentPage: page,
      totalPages: Math.ceil(totalStudents / limit),
      limit,
      booklets: booklets.map((booklet) => ({ ...booklet, price: Number(booklet.price) })),
      students: resultStudents,
    };
  }
}
