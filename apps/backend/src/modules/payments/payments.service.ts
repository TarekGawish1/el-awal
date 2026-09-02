import { ForbiddenException, Injectable } from '@nestjs/common';
import { GroupEnrollmentStatus, PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../../core/security/decorators/current-user.decorator';
import { MatrixLedgerQueryDto } from './dto/matrix-ledger-query.dto';
import { FinanceAnalyticsQueryDto } from './dto/finance-analytics-query.dto';

const FIRST_TERM_MONTHS = [8, 9, 10, 11, 12, 1];
const SECOND_TERM_MONTHS = [2, 3, 4, 5, 6, 7];

const STAGE_GRADE_LEVELS: Record<string, string[]> = {
  PRIMARY: [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  PREPARATORY: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  SECONDARY: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const rate = (collected: number, expected: number) => (expected > 0 ? Math.round((collected / expected) * 10000) / 100 : 0);

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

  private parseBillingConfig(value: unknown, availableMonths: number[]) {
    if (!value) {
      return { excludedMonths: [] as number[], paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
    }
    if (Array.isArray(value)) {
      const excludedMonths = value.map((m) => Number(m)).filter((m) => availableMonths.includes(m));
      return { excludedMonths, paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as any;
      const rawMonths = Array.isArray(obj.excludedMonths)
        ? obj.excludedMonths
        : Array.isArray(obj.months)
        ? obj.months
        : [];
      const excludedMonths = rawMonths.map((m: any) => Number(m)).filter((m: number) => availableMonths.includes(m));
      const paymentTiming = obj.paymentTiming === 'POSTPAID' ? 'POSTPAID' : 'PREPAID';
      return { excludedMonths, paymentTiming: paymentTiming as 'PREPAID' | 'POSTPAID' };
    }
    return { excludedMonths: [] as number[], paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
  }

  private normalizeExcludedMonths(value: unknown, availableMonths: number[]) {
    return this.parseBillingConfig(value, availableMonths).excludedMonths;
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

    const parsed = this.parseBillingConfig(configuration?.excludedMonths, availableMonths);

    return {
      academicYear: year,
      academicTerm: term,
      availableMonths,
      excludedMonths: parsed.excludedMonths,
      paymentTiming: parsed.paymentTiming,
    };
  }

  async updateBillingConfiguration(
    user: AuthenticatedUser,
    dto: { academicYear: string; academicTerm: string; excludedMonths: number[]; paymentTiming?: 'PREPAID' | 'POSTPAID' },
  ) {
    const teacherId = await this.resolveTeacherId(user);
    if (!teacherId) throw new ForbiddenException('A teacher profile is required to save billing configuration');

    const availableMonths = dto.academicTerm === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const { excludedMonths, paymentTiming } = this.parseBillingConfig(
      { excludedMonths: dto.excludedMonths, paymentTiming: dto.paymentTiming },
      availableMonths,
    );
    const configurationPayload = {
      excludedMonths,
      paymentTiming,
    };

    const configuration = await this.prisma.teacherBillingConfiguration.upsert({
      where: { teacherId_academicYear_academicTerm: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm } },
      create: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm, excludedMonths: configurationPayload },
      update: { excludedMonths: configurationPayload },
    });

    return {
      academicYear: configuration.academicYear,
      academicTerm: configuration.academicTerm,
      availableMonths,
      excludedMonths,
      paymentTiming,
    };
  }

  private isMonthStarted(
    academicYear: string,
    academicTerm: string,
    month: number,
    paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID',
  ) {
    const startYear = Number(academicYear.split('-')[0]);
    const actualYear = academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    if (paymentTiming === 'POSTPAID') {
      // POSTPAID (الدفع في نهاية الشهر): Becomes due and warned ONLY AFTER the month has ended
      return actualYear < currentYear || (actualYear === currentYear && month < currentMonth);
    }

    // PREPAID (الدفع مقدماً في بداية الشهر): Becomes due and warned as soon as the month starts
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
    const parsedBilling = this.parseBillingConfig(billingConfiguration?.excludedMonths, availableMonths);
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
      const enrollDay = enrollmentDate.getDate();

      const monthlyPayments: Record<number, { paymentId?: string; isApplicable?: boolean; isPaid: boolean; isPartiallyPaid: boolean; amountPaid: number; amountExpected: number; remainingAmount: number; paidAt?: Date; isStarted: boolean }> = {};
      const bookletPayments: Record<string, { paymentId?: string; isApplicable: boolean; isPaid: boolean; isPartiallyPaid: boolean; amountPaid: number; amountExpected: number; remainingAmount: number; paidAt?: Date }> = {};
      let totalDue = 0;
      let totalPaid = 0;

      for (const month of months) {
        const monthYear = paymentYearForMonth(month);
        const key = `${student.id}:TUITION:${month}:${monthYear}`;
        const payment = paymentMap.get(key);
        const amountPaid = payment?.amountPaid || 0;

        // Check if month is before enrollment date
        const isBeforeEnrollment = monthYear < enrollYear || (monthYear === enrollYear && month < enrollMonth);
        const isJoiningMonth = monthYear === enrollYear && month === enrollMonth;
        const isHalfMonth = isJoiningMonth && enrollDay > 15;
        const effectiveFee = isBeforeEnrollment ? 0 : isHalfMonth ? Math.round(monthlyFee / 2) : monthlyFee;

        const isPaid = isBeforeEnrollment ? false : Boolean(payment && (payment.isPaid || amountPaid >= effectiveFee) && (effectiveFee === 0 || amountPaid > 0));
        const isPartiallyPaid = Boolean(!isBeforeEnrollment && amountPaid > 0 && amountPaid < effectiveFee);
        const isStarted = this.isMonthStarted(academicYear, academicTerm, month, paymentTiming);

        monthlyPayments[month] = {
          paymentId: payment?.paymentId,
          isApplicable: !isBeforeEnrollment,
          isPaid,
          isPartiallyPaid,
          amountPaid,
          amountExpected: effectiveFee,
          remainingAmount: isBeforeEnrollment ? 0 : Math.max(0, effectiveFee - amountPaid),
          paidAt: payment?.paidAt,
          isStarted,
        };
        totalPaid += amountPaid;
        if (isStarted && !isBeforeEnrollment) {
          totalDue += Math.max(0, effectiveFee - amountPaid);
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

  private inferStage(gradeLevel: string): string {
    return Object.entries(STAGE_GRADE_LEVELS).find(([, grades]) => grades.includes(gradeLevel))?.[0] || '';
  }

  async getFinanceAnalytics(user: AuthenticatedUser, query: FinanceAnalyticsQueryDto) {
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('Only teachers and secretariat can view the financial analytics');
    }

    const { academicYear, academicTerm, availableMonths } = this.parsePeriod(query as MatrixLedgerQueryDto);
    const teacherId = await this.resolveTeacherId(user);
    const billingConfiguration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear, academicTerm } },
        })
      : null;
    const excludedMonths = this.normalizeExcludedMonths(billingConfiguration?.excludedMonths, availableMonths);
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

    const groupIds = new Set(groups.map((group) => group.id));
    const primaryGroupByStudent = new Map<string, string | null>();
    const studentCountByGroup = new Map<string, number>();
    const studentCountByGrade = new Map<string, number>();
    const tuitionExpectedByGroup = new Map<string, number>();
    const startYear = parseInt(academicYear.split('-')[0], 10) || new Date().getFullYear();

    for (const student of students) {
      const enrollmentGroupIds = student.groupEnrollments.map((enrollment) => enrollment.groupId);
      primaryGroupByStudent.set(student.id, enrollmentGroupIds[0] || null);
      studentCountByGrade.set(student.gradeLevel, (studentCountByGrade.get(student.gradeLevel) || 0) + 1);
      
      for (const enrollment of student.groupEnrollments) {
        const groupId = enrollment.groupId;
        studentCountByGroup.set(groupId, (studentCountByGroup.get(groupId) || 0) + 1);
        
        const group = groups.find(g => g.id === groupId);
        if (group) {
          let billableMonths = 0;
          for (const m of billingMonths) {
            const mYear = m >= 8 ? startYear : startYear + 1;
            const monthStart = new Date(mYear, m - 1, 1);
            const enrollmentDate = new Date(enrollment.enrolledAt);
            if (monthStart >= new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1)) {
              billableMonths++;
            }
          }
          const expected = Number(group.monthlyFee) * billableMonths;
          tuitionExpectedByGroup.set(groupId, (tuitionExpectedByGroup.get(groupId) || 0) + expected);
        }
      }
    }

    const tuitionCollectedByGroup = new Map<string, number>();
    const bookletCollectedByGroup = new Map<string, number>();
    for (const payment of payments) {
      const attributedGroupId =
        payment.groupId && groupIds.has(payment.groupId) ? payment.groupId : primaryGroupByStudent.get(payment.studentId) || null;
      if (!attributedGroupId || !groupIds.has(attributedGroupId)) continue;
      if (isMonthScope && payment.paymentType === PaymentType.TUITION && Number(payment.periodMonth) !== requestedMonth) continue;
      const target = payment.paymentType === PaymentType.BOOKLET ? bookletCollectedByGroup : tuitionCollectedByGroup;
      target.set(attributedGroupId, (target.get(attributedGroupId) || 0) + Number(payment.amountPaid || 0));
    }

    const groupRows = groups.map((group) => {
      const studentCount = studentCountByGroup.get(group.id) || 0;
      const tuitionExpected = round2(tuitionExpectedByGroup.get(group.id) || 0);
      const bookletsExpected = round2(
        booklets
          .filter((booklet) => booklet.gradeLevel === group.gradeLevel && (!booklet.groupId || booklet.groupId === group.id))
          .reduce((sum, booklet) => sum + Number(booklet.price) * studentCount, 0),
      );
      const tuitionCollected = round2(tuitionCollectedByGroup.get(group.id) || 0);
      const bookletsCollected = round2(bookletCollectedByGroup.get(group.id) || 0);
      const totalExpected = round2(tuitionExpected + bookletsExpected);
      const totalCollected = round2(tuitionCollected + bookletsCollected);

      return {
        id: group.id,
        name: group.name,
        gradeLevel: group.gradeLevel,
        stage: this.inferStage(group.gradeLevel),
        studentCount,
        tuition: {
          expected: tuitionExpected,
          collected: tuitionCollected,
          remaining: Math.max(0, round2(tuitionExpected - tuitionCollected)),
          rate: rate(tuitionCollected, tuitionExpected),
        },
        booklets: {
          expected: bookletsExpected,
          collected: bookletsCollected,
          remaining: Math.max(0, round2(bookletsExpected - bookletsCollected)),
          rate: rate(bookletsCollected, bookletsExpected),
        },
        total: {
          expected: totalExpected,
          collected: totalCollected,
          remaining: Math.max(0, round2(totalExpected - totalCollected)),
          rate: rate(totalCollected, totalExpected),
        },
      };
    });

    const overviewTuitionExpected = round2(groupRows.reduce((sum, group) => sum + group.tuition.expected, 0));
    const overviewTuitionCollected = round2(groupRows.reduce((sum, group) => sum + group.tuition.collected, 0));
    const overviewBookletsExpected = round2(
      booklets.reduce(
        (sum, booklet) =>
          sum +
          Number(booklet.price) *
            (booklet.groupId ? studentCountByGroup.get(booklet.groupId) || 0 : studentCountByGrade.get(booklet.gradeLevel) || 0),
        0,
      ),
    );
    const overviewBookletsCollected = round2(groupRows.reduce((sum, group) => sum + group.booklets.collected, 0));
    const overviewTotalExpected = round2(overviewTuitionExpected + overviewBookletsExpected);
    const overviewTotalCollected = round2(overviewTuitionCollected + overviewBookletsCollected);

    return {
      academicYear,
      academicTerm,
      months: billingMonths,
      periodMonth: isMonthScope ? requestedMonth : null,
      scope: isMonthScope ? 'MONTH' : 'TERM',
      overview: {
        totalExpected: overviewTotalExpected,
        totalCollected: overviewTotalCollected,
        totalRemaining: Math.max(0, round2(overviewTotalExpected - overviewTotalCollected)),
        collectionRate: rate(overviewTotalCollected, overviewTotalExpected),
        totalStudents: students.length,
        tuition: {
          expected: overviewTuitionExpected,
          collected: overviewTuitionCollected,
          remaining: Math.max(0, round2(overviewTuitionExpected - overviewTuitionCollected)),
          collectionRate: rate(overviewTuitionCollected, overviewTuitionExpected),
        },
        booklets: {
          expected: overviewBookletsExpected,
          collected: overviewBookletsCollected,
          remaining: Math.max(0, round2(overviewBookletsExpected - overviewBookletsCollected)),
          collectionRate: rate(overviewBookletsCollected, overviewBookletsExpected),
        },
      },
      groups: groupRows,
    };
  }
}
