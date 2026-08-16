import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentStatus, GroupEnrollmentStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Records or updates a tuition payment record and dispatches payment event upon success.
   */
  async recordStudentPayment(recordedById: string, dto: RecordPaymentDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
      include: { user: { select: { fullName: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student [${dto.studentId}] not found`);
    }

    let amountExpected = dto.amountExpected;
    let groupName = 'عام';

    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }
      groupName = group.name;
      if (amountExpected === undefined) {
        amountExpected = Number(group.monthlyFee);
      }
    }

    const payment = await this.prisma.studentPaymentRecord.upsert({
      where: {
        studentId_groupId_periodYear_periodMonth: {
          studentId: dto.studentId,
          groupId: dto.groupId || '',
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
        },
      },
      create: {
        studentId: dto.studentId,
        groupId: dto.groupId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
        amountExpected: amountExpected ?? 0,
        amountPaid: dto.amountPaid,
        currency: 'EGP',
        paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes,
        recordedById,
      },
      update: {
        amountPaid: dto.amountPaid,
        ...(amountExpected !== undefined ? { amountExpected } : {}),
        paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes,
        recordedById,
      },
      include: {
        student: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
        group: { select: { id: true, name: true } },
      },
    });

    // If payment is marked as PAID, dispatch asynchronous domain event
    if (payment.paymentStatus === PaymentStatus.PAID) {
      this.eventEmitter.emit('payment.recorded', {
        studentId: dto.studentId,
        studentName: student.user.fullName,
        groupId: dto.groupId,
        groupName,
        amountPaid: Number(payment.amountPaid),
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      });
    }

    this.logger.log(
      `Payment recorded: Student [${dto.studentId}], Period ${dto.periodMonth}/${dto.periodYear}, Paid: ${dto.amountPaid} EGP`,
    );

    return payment;
  }

  /**
   * Keyset cursor-paginated tuition payment audit log with multi-criteria filters.
   */
  async getPaymentLog(query: PaymentQueryDto) {
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

    const payments = await this.prisma.studentPaymentRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        student: {
          include: { user: { select: { id: true, fullName: true, phone: true } } },
        },
        group: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    });

    return CursorPaginationHelper.formatResponse(payments, limit);
  }

  /**
   * Complete payment and billing history for a student across all groups.
   */
  async getStudentPaymentHistory(studentId: string) {
    const records = await this.prisma.studentPaymentRecord.findMany({
      where: { studentId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        group: { select: { id: true, name: true } },
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
  ) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    // 1. Get all active enrollments in this group
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

    // 2. Find students who have PAID for this billing period
    const paidRecords = await this.prisma.studentPaymentRecord.findMany({
      where: {
        groupId,
        periodYear,
        periodMonth,
        paymentStatus: PaymentStatus.PAID,
      },
      select: { studentId: true },
    });

    const paidStudentIds = new Set(paidRecords.map((r) => r.studentId));

    // 3. Filter unpaid students
    const defaulters = enrollments
      .filter((e) => !paidStudentIds.has(e.studentId))
      .map((e) => ({
        studentId: e.student.id,
        studentCode: e.student.studentCode,
        fullName: e.student.user.fullName,
        phone: e.student.user.phone,
        gradeLevel: e.student.gradeLevel,
        monthlyFeeExpected: Number(group.monthlyFee),
        parentName: e.student.parentLinks[0]?.parent.user.fullName || null,
        parentPhone: e.student.parentLinks[0]?.parent.user.phone || null,
      }));

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
