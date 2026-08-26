import { ForbiddenException, Injectable } from '@nestjs/common';
import { GroupEnrollmentStatus, PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../../core/security/decorators/current-user.decorator';
import { MatrixLedgerQueryDto } from './dto/matrix-ledger-query.dto';

const FIRST_TERM_MONTHS = [8, 9, 10, 11, 12, 1];
const SECOND_TERM_MONTHS = [2, 3, 4, 5, 6, 7];

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private parsePeriod(query: MatrixLedgerQueryDto) {
    let academicYear = query.academicYear;
    let academicTerm = query.academicTerm;

    if (query.academicPeriodId) {
      const match = query.academicPeriodId.match(/^(\d{4}-\d{4})[:|_-](FIRST_TERM|SECOND_TERM)$/);
      if (match) {
        academicYear = academicYear || match[1];
        academicTerm = academicTerm || match[2];
      }
    }

    academicYear = academicYear || '2026-2027';
    academicTerm = academicTerm || 'FIRST_TERM';

    const startYear = Number(academicYear.split('-')[0]);
    const availableMonths = academicTerm === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const paymentYearForMonth = (month: number) =>
      academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;

    return { academicYear, academicTerm, availableMonths, paymentYearForMonth };
  }

  private async resolveTeacherId(user: AuthenticatedUser) {
    if (user.role !== UserRole.TEACHER) return null;
    if (user.teacherProfileId) return user.teacherProfileId;

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { OR: [{ id: user.id }, { user: { id: user.id } }] },
      select: { id: true },
    });
    return teacher?.id || user.id;
  }

  private normalizeExcludedMonths(value: unknown, availableMonths: number[]) {
    if (!Array.isArray(value)) return [];
    return value
      .map((month) => Number(month))
      .filter((month) => availableMonths.includes(month));
  }

  async getBillingConfiguration(user: AuthenticatedUser, academicYear?: string, academicTerm?: string) {
    const teacherId = await this.resolveTeacherId(user);
    const year = academicYear || '2026-2027';
    const term = academicTerm === 'SECOND_TERM' ? 'SECOND_TERM' : 'FIRST_TERM';
    const availableMonths = term === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const configuration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear: year, academicTerm: term } },
        })
      : null;

    return {
      academicYear: year,
      academicTerm: term,
      availableMonths,
      excludedMonths: this.normalizeExcludedMonths(configuration?.excludedMonths, availableMonths),
    };
  }

  async updateBillingConfiguration(user: AuthenticatedUser, dto: { academicYear: string; academicTerm: string; excludedMonths: number[] }) {
    const teacherId = await this.resolveTeacherId(user);
    if (!teacherId) throw new ForbiddenException('A teacher profile is required to save billing configuration');

    const availableMonths = dto.academicTerm === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const excludedMonths = this.normalizeExcludedMonths(dto.excludedMonths, availableMonths);
    const configuration = await this.prisma.teacherBillingConfiguration.upsert({
      where: { teacherId_academicYear_academicTerm: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm } },
      create: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm, excludedMonths },
      update: { excludedMonths },
    });

    return {
      academicYear: configuration.academicYear,
      academicTerm: configuration.academicTerm,
      availableMonths,
      excludedMonths,
    };
  }

  private isMonthStarted(academicYear: string, academicTerm: string, month: number) {
    const startYear = Number(academicYear.split('-')[0]);
    const actualYear = academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    return actualYear < currentYear || (actualYear === currentYear && month <= currentMonth);
  }

  async getMatrixLedger(user: AuthenticatedUser, query: MatrixLedgerQueryDto) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial matrix ledger');
    }

    const { academicYear, academicTerm, availableMonths, paymentYearForMonth } = this.parsePeriod(query);
    const teacherId = await this.resolveTeacherId(user);
    const billingConfiguration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear, academicTerm } },
        })
      : null;
    const excludedMonths = this.normalizeExcludedMonths(billingConfiguration?.excludedMonths, availableMonths);
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
    if (query.stage && query.stage !== 'ALL') studentWhere.academicStage = query.stage;
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
        user: { select: { fullName: true, phone: true } },
        gradeLevel: true,
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE, group: groupScope },
          orderBy: { enrolledAt: 'asc' },
          select: {
            groupId: true,
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
      paymentConditions.push({ paymentType: PaymentType.TUITION, groupId: { in: groupIds }, OR: paymentPeriods });
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
          },
          select: {
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

    const paymentMap = new Map<string, { amountPaid: number; amountExpected: number; isPaid: boolean; paidAt?: Date }>();
    for (const payment of payments) {
      const key = payment.paymentType === PaymentType.BOOKLET
        ? `${payment.studentId}:BOOKLET:${payment.bookletId}`
        : `${payment.studentId}:TUITION:${payment.periodMonth}:${payment.periodYear}`;
      const previous = paymentMap.get(key);
      const amountPaid = (previous?.amountPaid || 0) + Number(payment.amountPaid || 0);
      const amountExpected = Number(payment.amountExpected || 0);
      const paidAt = !previous?.paidAt || payment.createdAt > previous.paidAt ? payment.createdAt : previous.paidAt;
      paymentMap.set(key, {
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
      const monthlyPayments: Record<number, { isPaid: boolean; amountPaid: number; paidAt?: Date; isStarted: boolean }> = {};
      const bookletPayments: Record<string, { isApplicable: boolean; isPaid: boolean; amountPaid: number; paidAt?: Date }> = {};
      let totalDue = 0;
      let totalPaid = 0;

      for (const month of months) {
        const key = `${student.id}:TUITION:${month}:${paymentYearForMonth(month)}`;
        const payment = paymentMap.get(key);
        const isPaid = Boolean(payment && payment.isPaid && payment.amountPaid >= monthlyFee);
        monthlyPayments[month] = { isPaid, amountPaid: payment?.amountPaid || 0, paidAt: payment?.paidAt, isStarted: this.isMonthStarted(academicYear, academicTerm, month) };
        totalPaid += payment?.amountPaid || 0;
        if (this.isMonthStarted(academicYear, academicTerm, month)) {
          totalDue += Math.max(0, monthlyFee - (payment?.amountPaid || 0));
        }
      }

      for (const booklet of booklets) {
        if (booklet.gradeLevel !== student.gradeLevel) {
          bookletPayments[booklet.id] = { isApplicable: false, isPaid: false, amountPaid: 0 };
          continue;
        }

        const payment = paymentMap.get(`${student.id}:BOOKLET:${booklet.id}`);
        const price = Number(booklet.price);
        const isPaid = Boolean(payment && payment.isPaid && payment.amountPaid >= price);
        bookletPayments[booklet.id] = { isApplicable: true, isPaid, amountPaid: payment?.amountPaid || 0, paidAt: payment?.paidAt };
        totalPaid += payment?.amountPaid || 0;
        if (!isPaid) totalDue += price;
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
      totalStudents,
      currentPage: page,
      totalPages: Math.ceil(totalStudents / limit),
      limit,
      booklets: booklets.map((booklet) => ({ ...booklet, price: Number(booklet.price) })),
      students: resultStudents,
    };
  }
}
