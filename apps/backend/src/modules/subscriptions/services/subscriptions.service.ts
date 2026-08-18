import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { ScanPaymentQrDto } from '../dto/scan-payment-qr.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentStatus, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

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
  async recordStudentPayment(user: AuthenticatedUser, dto: RecordPaymentDto) {
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

      if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        if (group.teacherId !== teacherId && group.teacherId !== user.id) {
          throw new ForbiddenException('You do not own the academic group for this payment');
        }
      }

      // Check active enrollment in group
      const enrollment = await this.prisma.groupEnrollment.findUnique({
        where: {
          groupId_studentId: {
            groupId: dto.groupId,
            studentId: dto.studentId,
          },
        },
      });

      if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
        throw new BadRequestException('Student is not actively enrolled in this academic group');
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
          groupId: dto.groupId ?? null,
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
        recordedById: user.id,
      },
      update: {
        amountPaid: dto.amountPaid,
        ...(amountExpected !== undefined ? { amountExpected } : {}),
        paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes,
        recordedById: user.id,
      },
      include: {
        student: {
          include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
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
   * Scans student QR code and automatically records the student tuition payment.
   */
  async scanPaymentQr(user: AuthenticatedUser, dto: ScanPaymentQrDto) {
    // 1. Resolve student by QR token
    const student = await this.prisma.studentProfile.findUnique({
      where: { qrCodeToken: dto.qrCodeToken },
      include: {
        user: { select: { fullName: true, phone: true, isActive: true } },
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          include: { group: true },
        },
      },
    });

    if (!student || !student.user.isActive) {
      throw new BadRequestException('رمز QR غير صالح أو حساب الطالب غير نشط');
    }

    // 2. Resolve target group
    let targetGroup: { id: string; name: string; monthlyFee: any; teacherId: string } | null = null;

    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }

      if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        if (group.teacherId !== teacherId && group.teacherId !== user.id) {
          throw new ForbiddenException('You do not own the academic group for this payment');
        }
      }

      targetGroup = group;
    } else {
      // Auto-resolve group from student's active enrollments
      let eligibleEnrollments = student.groupEnrollments;
      if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        eligibleEnrollments = student.groupEnrollments.filter(
          (e) => e.group.teacherId === teacherId || e.group.teacherId === user.id,
        );
      }

      if (eligibleEnrollments.length > 0) {
        targetGroup = eligibleEnrollments[0].group;
      }
    }

    const now = new Date();
    const periodYear = dto.periodYear ?? now.getFullYear();
    const periodMonth = dto.periodMonth ?? (now.getMonth() + 1);

    const amountExpected = targetGroup ? Number(targetGroup.monthlyFee) : 0;
    const amountPaid = dto.amountPaid !== undefined ? dto.amountPaid : amountExpected;

    // 3. Check for previous payment in this period
    const existingPayment = await this.prisma.studentPaymentRecord.findUnique({
      where: {
        studentId_groupId_periodYear_periodMonth: {
          studentId: student.id,
          groupId: targetGroup ? targetGroup.id : null,
          periodYear,
          periodMonth,
        },
      },
    });

    const isDuplicate = !!(
      existingPayment &&
      existingPayment.paymentStatus === PaymentStatus.PAID &&
      Number(existingPayment.amountPaid) >= amountExpected
    );

    // 4. Upsert payment record
    const payment = await this.prisma.studentPaymentRecord.upsert({
      where: {
        studentId_groupId_periodYear_periodMonth: {
          studentId: student.id,
          groupId: targetGroup ? targetGroup.id : null,
          periodYear,
          periodMonth,
        },
      },
      create: {
        studentId: student.id,
        groupId: targetGroup ? targetGroup.id : null,
        periodYear,
        periodMonth,
        amountExpected,
        amountPaid,
        currency: 'EGP',
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes || 'تم السداد عبر مسح رمز الـ QR',
        recordedById: user.id,
      },
      update: {
        amountPaid,
        amountExpected,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes || 'تم السداد عبر مسح رمز الـ QR',
        recordedById: user.id,
      },
      include: {
        student: {
          include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
        },
        group: { select: { id: true, name: true } },
      },
    });

    // 5. Emit payment recorded event
    this.eventEmitter.emit('payment.recorded', {
      studentId: student.id,
      studentName: student.user.fullName,
      parentPhone: student.user.phone,
      groupName: targetGroup ? targetGroup.name : 'عام',
      amountPaid: Number(payment.amountPaid),
      periodYear,
      periodMonth,
    });

    this.logger.log(
      `QR Payment processed: Student [${student.user.fullName}], Period ${periodMonth}/${periodYear}, Paid: ${amountPaid} EGP`,
    );

    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? `تم تحديث سداد الطالب ${student.user.fullName} (مسجل مسبقاً)`
        : `تم تسجيل سداد الطالب ${student.user.fullName} بنجاح`,
      payment,
      student: {
        id: student.id,
        fullName: student.user.fullName,
        phone: student.user.phone,
      },
      group: targetGroup ? { id: targetGroup.id, name: targetGroup.name } : null,
    };
  }

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

  /**
   * Deletes a payment record.
   */
  async deleteStudentPayment(id: string, user: AuthenticatedUser) {
    const payment = await this.prisma.studentPaymentRecord.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record [${id}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (payment.group && payment.group.teacherId !== teacherId && payment.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this payment');
      }
    }

    await this.prisma.studentPaymentRecord.delete({
      where: { id },
    });

    this.logger.log(`Payment [${id}] deleted by User [${user.id}]`);
    return { success: true };
  }
}
