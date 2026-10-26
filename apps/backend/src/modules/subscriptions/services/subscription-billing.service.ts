import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { CancelPaymentDto } from '../dto/cancel-payment.dto';
import { PaymentStatus, PaymentType, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  calculateProratedTuition,
  isEnrolledInPeriod,
  isPeriodBeforeEnrollment,
} from '../utils/proration.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { executeBookletPayment } from '../helpers/subscription-booklet.helper';

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  private async runInTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(fn);
    }
    return fn(this.prisma);
  }

  /**
   * Records or updates a tuition or booklet payment record and dispatches payment event upon success.
   */
  async recordStudentPayment(user: AuthenticatedUser, dto: RecordPaymentDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
      include: {
        user: { select: { fullName: true, phone: true } },
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          select: { groupId: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student [${dto.studentId}] not found`);
    }

    const isBooklet = dto.paymentType === 'BOOKLET' || Boolean(dto.bookletId);
    const now = new Date();
    const periodYear = dto.periodYear ?? now.getFullYear();
    const periodMonth = dto.periodMonth ?? (now.getMonth() + 1);

    let amountExpected = dto.amountExpected;
    let groupName = 'عام';
    let bookletTitle: string | undefined;

    // 1. Booklet Payment Flow
    if (isBooklet) {
      return executeBookletPayment(
        this.prisma,
        this.eventEmitter,
        user,
        dto,
        student,
        periodYear,
        periodMonth,
        amountExpected,
        (fn) => this.runInTransaction(fn),
        this.redisCache,
      );
    }

    // 2. Regular Monthly Tuition Payment Flow
    if (!dto.groupId) {
      if (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT) {
        let teacherId = user.teacherProfileId || user.id;
        if (user.role === UserRole.SECRETARIAT && typeof this.prisma.teacherAssistant?.findFirst === 'function') {
          const link = await this.prisma.teacherAssistant.findFirst({
            where: { assistantId: user.id, status: 'ACTIVE' },
            select: { teacherId: true },
          });
          if (link) {
            teacherId = link.teacherId;
          }
        }

        const teacherEnrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            studentId: dto.studentId,
            status: GroupEnrollmentStatus.ACTIVE,
            group: {
              OR: [{ teacherId }, { teacher: { id: teacherId } }],
            },
          },
          include: { group: true },
        });

        if (teacherEnrollments.length === 0) {
          throw new ForbiddenException(
            'لا يمكنك تسجيل اشتراك شهري لطالب غير مسجل في أي من مجموعاتك الدراسية',
          );
        } else if (teacherEnrollments.length === 1) {
          dto.groupId = teacherEnrollments[0].groupId;
        } else {
          throw new BadRequestException(
            'الطالب مسجل في أكثر من مجموعة لهذا المعلم. يرجى تحديد معرف المجموعة groupId',
          );
        }
      } else {
        const activeEnrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            studentId: dto.studentId,
            status: GroupEnrollmentStatus.ACTIVE,
          },
          include: { group: true },
        });
        if (activeEnrollments.length === 1) {
          dto.groupId = activeEnrollments[0].groupId;
        } else if (activeEnrollments.length > 1) {
          throw new BadRequestException(
            'يرجى تحديد معرف المجموعة الدراسية groupId',
          );
        }
      }
    }

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
        if (enrollment.enrolledAt && isEnrolledInPeriod(enrollment.enrolledAt, periodYear, periodMonth)) {
          amountExpected = calculateProratedTuition(Number(group.monthlyFee), new Date(enrollment.enrolledAt)).expectedAmount;
        } else if (enrollment.enrolledAt && isPeriodBeforeEnrollment(enrollment.enrolledAt, periodYear, periodMonth)) {
          amountExpected = 0;
        } else {
          amountExpected = Number(group.monthlyFee);
        }
      }
    }

    const payment = await this.runInTransaction(async (tx) => {
      const existingPayment = await tx.studentPaymentRecord.findFirst({
        where: {
          studentId: dto.studentId,
          groupId: dto.groupId ?? null,
          periodYear,
          periodMonth,
          paymentType: PaymentType.TUITION,
        },
      });

      if (existingPayment) {
        const exp = amountExpected !== undefined ? amountExpected : Number(existingPayment.amountExpected || 0);
        const paid = Number(dto.amountPaid);
        const isPaidInFull = (dto.paymentStatus === PaymentStatus.EXEMPT) || paid >= exp;

        return tx.studentPaymentRecord.update({
          where: { id: existingPayment.id },
          data: {
            amountPaid: paid,
            amountExpected: exp,
            paymentStatus: isPaidInFull ? PaymentStatus.PAID : (dto.paymentStatus || PaymentStatus.PENDING),
            paymentMethod: dto.paymentMethod || 'CASH',
            receiptNumber: dto.receiptNumber || existingPayment.receiptNumber,
            notes: dto.notes || existingPayment.notes,
            recordedById: user.id,
            updatedAt: new Date(),
          },
          include: {
            student: {
              include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
            },
            group: { select: { id: true, name: true } },
            booklet: { select: { id: true, title: true, price: true } },
          },
        });
      } else {
        const exp = amountExpected ?? 0;
        const paid = Number(dto.amountPaid);
        const isPaidInFull = (dto.paymentStatus === PaymentStatus.EXEMPT) || paid >= exp;

        return tx.studentPaymentRecord.create({
          data: {
            studentId: dto.studentId,
            groupId: dto.groupId || null,
            paymentType: PaymentType.TUITION,
            periodYear,
            periodMonth,
            amountExpected: exp,
            amountPaid: paid,
            currency: 'EGP',
            paymentStatus: isPaidInFull ? PaymentStatus.PAID : (dto.paymentStatus || PaymentStatus.PENDING),
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
            booklet: { select: { id: true, title: true, price: true } },
          },
        });
      }
    });

    if (payment.paymentStatus === PaymentStatus.PAID) {
      const remaining = Math.max(0, Number(payment.amountExpected || 0) - Number(payment.amountPaid || 0));
      this.eventEmitter.emit('payment.recorded', {
        studentId: dto.studentId,
        studentName: student.user.fullName,
        groupId: dto.groupId,
        groupName,
        paymentType: 'TUITION',
        amountPaid: Number(payment.amountPaid),
        amountExpected: Number(payment.amountExpected || 0),
        remainingBalance: remaining,
        currency: payment.currency || 'EGP',
        receiptNumber: payment.receiptNumber || undefined,
        paymentMethod: payment.paymentMethod || 'نقدي',
        periodYear,
        periodMonth,
      });
    }

    this.logger.log(
      `Payment recorded: Student [${dto.studentId}], Period ${periodMonth}/${periodYear}, Paid: ${dto.amountPaid} EGP`,
    );

    if (this.redisCache) {
      await this.redisCache.del(`student:dashboard:${dto.studentId}`);
      await this.redisCache.del(`parent:overview:${dto.studentId}`);
    }

    return payment;
  }

  /**
   * Deletes a payment record completely (e.g. recorded by mistake).
   */
  async deleteStudentPayment(id: string, user: AuthenticatedUser) {
    const payment = await this.prisma.studentPaymentRecord.findUnique({
      where: { id },
      include: {
        group: true,
        booklet: true,
        student: {
          include: { user: { select: { fullName: true } } },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record [${id}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (payment.group && payment.group.teacherId !== teacherId && payment.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this payment');
      }
      if (payment.booklet && payment.booklet.teacherProfileId !== teacherId) {
        throw new ForbiddenException('You do not own the academic group or booklet for this payment');
      }
    }

    await this.runInTransaction(async (tx) => {
      await tx.studentPaymentRecord.delete({
        where: { id },
      });
    });

    this.eventEmitter.emit('payment.deleted', {
      paymentId: id,
      studentId: payment.studentId,
      studentName: payment.student?.user?.fullName,
      amountPaid: Number(payment.amountPaid),
      periodYear: payment.periodYear,
      periodMonth: payment.periodMonth,
      paymentType: payment.paymentType,
    });

    this.logger.log(`Payment [${id}] deleted by User [${user.id}]`);
    return { success: true };
  }

  /**
   * Refunds/cancels a recorded payment (e.g. student wanted money back).
   */
  async refundStudentPayment(id: string, dto: CancelPaymentDto, user: AuthenticatedUser) {
    const payment = await this.prisma.studentPaymentRecord.findUnique({
      where: { id },
      include: {
        group: true,
        booklet: true,
        student: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record [${id}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (payment.group && payment.group.teacherId !== teacherId && payment.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this payment');
      }
      if (payment.booklet && payment.booklet.teacherProfileId !== teacherId) {
        throw new ForbiddenException('You do not own the academic group or booklet for this payment');
      }
    }

    const updatedPayment = await this.runInTransaction(async (tx) => {
      return tx.studentPaymentRecord.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          notes: dto?.reason ? `[تم استرداد المبلغ]: ${dto.reason}` : (payment.notes ? `${payment.notes} - [مسترد]` : 'تم استرداد المبلغ وإلغاء المعاملة'),
          updatedAt: new Date(),
        },
        include: {
          student: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
          group: { select: { id: true, name: true } },
          booklet: { select: { id: true, title: true, price: true } },
        },
      });
    });

    this.eventEmitter.emit('payment.refunded', {
      paymentId: id,
      studentId: payment.studentId,
      studentName: payment.student?.user?.fullName,
      parentPhone: payment.student?.user?.phone,
      amountRefunded: Number(payment.amountPaid),
      periodYear: payment.periodYear,
      periodMonth: payment.periodMonth,
      paymentType: payment.paymentType,
      reason: dto?.reason,
    });

    this.logger.log(`Payment [${id}] marked as REFUNDED by User [${user.id}]`);
    return {
      success: true,
      message: 'تم تسجيل استرداد المبلغ وإلغاء الدفعة بنجاح',
      payment: updatedPayment,
    };
  }
}
