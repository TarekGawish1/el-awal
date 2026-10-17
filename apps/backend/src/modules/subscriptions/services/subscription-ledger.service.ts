import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentStatus, PaymentType, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  calculateProratedTuition,
  isEnrolledInPeriod,
  isPeriodBeforeEnrollment,
} from '../utils/proration.util';

@Injectable()
export class SubscriptionLedgerService {
  private readonly logger = new Logger(SubscriptionLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Keyset cursor-paginated tuition payment audit log with multi-criteria filters.
   */
  async getPaymentLog(query: PaymentQueryDto, user: AuthenticatedUser) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    const where: any = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.periodYear ? { periodYear: query.periodYear } : {}),
      ...(query.periodMonth ? { periodMonth: query.periodMonth } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(cursorFilter || {}),
    };

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      where.group = {
        OR: [
          { teacherId },
          { teacher: { id: teacherId } },
        ],
      };
    }

    const payments = await this.prisma.studentPaymentRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        student: {
          include: { user: { select: { id: true, fullName: true, phone: true } } },
        },
        group: { select: { id: true, name: true } },
        booklet: { select: { id: true, title: true, price: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    });

    return CursorPaginationHelper.formatResponse(payments, limit);
  }

  /**
   * Complete payment and billing history for a student across all groups with IDOR check.
   */
  async getStudentPaymentHistory(studentId: string, user: AuthenticatedUser) {
    if (user.role === UserRole.STUDENT) {
      const myStudentId = user.studentProfileId || user.id;
      if (myStudentId !== studentId) {
        throw new ForbiddenException('Students can only access their own payment history');
      }
    } else if (user.role === UserRole.PARENT) {
      const parentId = user.parentProfileId || user.id;
      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException('Guardians can only view linked children payment history');
      }
    } else if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      const enrolledInTeacherGroup = await this.prisma.groupEnrollment.findFirst({
        where: {
          studentId,
          status: GroupEnrollmentStatus.ACTIVE,
          group: {
            OR: [
              { teacherId },
              { teacher: { id: teacherId } },
            ],
          },
        },
      });
      if (!enrolledInTeacherGroup) {
        throw new ForbiddenException('Student is not enrolled in your academic groups');
      }
    }

    const records = await this.prisma.studentPaymentRecord.findMany({
      where: { studentId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        group: { select: { id: true, name: true } },
        booklet: { select: { id: true, title: true, price: true } },
        recordedBy: { select: { fullName: true } },
      },
    });

    return records.map((r) => ({
      ...r,
      amountExpected: Number(r.amountExpected),
      amountPaid: Number(r.amountPaid),
    }));
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
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (group.teacherId !== teacherId && group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own this academic group');
      }
    }

    const enrollments = await this.prisma.groupEnrollment.findMany({
      where: { groupId, status: GroupEnrollmentStatus.ACTIVE },
      include: {
        student: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            parentLinks: {
              include: {
                parent: {
                  include: { user: { select: { fullName: true, phone: true } } },
                },
              },
            },
          },
        },
      },
    });

    const groupFee = Number(group.monthlyFee);
    const paymentRecords = await this.prisma.studentPaymentRecord.findMany({
      where: {
        groupId,
        periodYear,
        periodMonth,
        paymentType: PaymentType.TUITION,
      },
      select: {
        id: true,
        studentId: true,
        amountPaid: true,
        amountExpected: true,
        paymentStatus: true,
      },
    });

    const paymentMap = new Map<string, typeof paymentRecords[0]>();
    for (const record of paymentRecords) {
      paymentMap.set(record.studentId, record);
    }

    const billingConfig = await this.prisma.teacherBillingConfiguration.findUnique({
      where: {
        teacherId_academicYear_academicTerm: {
          teacherId: group.teacherId,
          academicYear: group.academicYear,
          academicTerm: group.academicTerm,
        },
      },
    });

    let paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID';
    let excludedMonths: number[] = [];
    if (billingConfig?.excludedMonths) {
      if (Array.isArray(billingConfig.excludedMonths)) {
        excludedMonths = billingConfig.excludedMonths.map(Number).filter((n) => !isNaN(n));
      } else if (typeof billingConfig.excludedMonths === 'object') {
        const raw = billingConfig.excludedMonths as any;
        if (Array.isArray(raw.excludedMonths)) {
          excludedMonths = raw.excludedMonths.map(Number).filter((n: any) => !isNaN(n));
        }
        if (raw.paymentTiming === 'POSTPAID' || raw.paymentTiming === 'PREPAID') {
          paymentTiming = raw.paymentTiming;
        }
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let isPeriodDue = false;
    if (paymentTiming === 'POSTPAID') {
      isPeriodDue = periodYear < currentYear || (periodYear === currentYear && periodMonth < currentMonth);
    } else {
      isPeriodDue = periodYear < currentYear || (periodYear === currentYear && periodMonth <= currentMonth);
    }

    const isMonthExcluded = excludedMonths.includes(periodMonth);

    const defaulters = (!isPeriodDue || isMonthExcluded)
      ? []
      : enrollments
          .filter((e) => {
            const enrollmentDate = e.enrolledAt ? new Date(e.enrolledAt) : null;

            if (enrollmentDate && isPeriodBeforeEnrollment(enrollmentDate, periodYear, periodMonth)) {
              return false;
            }

            const isJoiningMonth = enrollmentDate ? isEnrolledInPeriod(enrollmentDate, periodYear, periodMonth) : false;
            const prorated = isJoiningMonth && enrollmentDate
              ? calculateProratedTuition(groupFee, enrollmentDate)
              : null;
            const expectedFee = prorated ? prorated.expectedAmount : groupFee;

            if (expectedFee === 0) {
              return false;
            }

            const record = paymentMap.get(e.studentId);
            if (!record) return true;
            const amountPaid = Number(record.amountPaid || 0);
            const isFullyPaid =
              (record.paymentStatus === PaymentStatus.PAID || record.paymentStatus === PaymentStatus.EXEMPT) &&
              amountPaid >= expectedFee;
            return !isFullyPaid;
          })
          .map((e) => {
            const enrollmentDate = e.enrolledAt ? new Date(e.enrolledAt) : null;
            const isJoiningMonth = enrollmentDate ? isEnrolledInPeriod(enrollmentDate, periodYear, periodMonth) : false;
            const proration = isJoiningMonth && enrollmentDate
              ? calculateProratedTuition(groupFee, enrollmentDate)
              : null;
            const expectedFee = proration ? proration.expectedAmount : groupFee;

            const record = paymentMap.get(e.studentId);
            const amountPaid = Number(record?.amountPaid || 0);
            const remainingAmount = Math.max(0, expectedFee - amountPaid);
            return {
              studentId: e.student.id,
              studentCode: e.student.studentCode,
              fullName: e.student.user.fullName,
              phone: e.student.user.phone,
              gradeLevel: e.student.gradeLevel,
              monthlyFeeExpected: expectedFee,
              amountPaid,
              remainingAmount,
              isPartiallyPaid: amountPaid > 0,
              paymentRecordId: record?.id || null,
              parentName: e.student.parentLinks[0]?.parent.user.fullName || null,
              parentPhone: e.student.parentLinks[0]?.parent.user.phone || null,
              calculationReason: proration?.calculationReason || null,
              rateMultiplier: proration?.rateMultiplier ?? 1.0,
            };
          });

    return {
      groupId: group.id,
      groupName: group.name,
      periodYear,
      periodMonth,
      totalEnrolled: enrollments.length,
      totalDefaulters: defaulters.length,
      defaulters,
    };
  }
}
