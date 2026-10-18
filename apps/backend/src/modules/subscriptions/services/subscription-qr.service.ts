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
import { ScanPaymentQrDto } from '../dto/scan-payment-qr.dto';
import { PaymentStatus, PaymentType, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  calculateProratedTuition,
  isEnrolledInPeriod,
  isPeriodBeforeEnrollment,
} from '../utils/proration.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class SubscriptionQrService {
  private readonly logger = new Logger(SubscriptionQrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  private async runInTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(fn, { maxWait: 15000, timeout: 30000 });
    }
    return fn(this.prisma);
  }

  /**
   * Scans student QR code and automatically records the student tuition or booklet payment.
   */
  async scanPaymentQr(user: AuthenticatedUser, dto: ScanPaymentQrDto) {
    const trimmedToken = dto.qrCodeToken?.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { qrCodeToken: trimmedToken },
          { studentCode: trimmedToken },
          ...(isUuid ? [{ id: trimmedToken }] : []),
        ],
      },
      include: {
        user: { select: { fullName: true, phone: true, isActive: true } },
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          include: { group: true },
        },
      },
    });

    if (!student || !student.user.isActive) {
      throw new BadRequestException('رمز الـ QR غير صالح أو أن حساب الطالب غير مفعّل.');
    }

    const isBooklet = dto.paymentType === 'BOOKLET' || Boolean(dto.bookletId);
    const now = new Date();
    const periodYear = dto.periodYear ?? now.getFullYear();
    const periodMonth = dto.periodMonth ?? (now.getMonth() + 1);

    // Flow A: QR Booklet Purchase
    if (isBooklet) {
      if (!dto.bookletId) {
        throw new BadRequestException('معرف المذكرة مطلوب لسداد قيمة مذكرة');
      }

      const booklet = await this.prisma.booklet.findUnique({
        where: { id: dto.bookletId },
        include: { group: true },
      });

      if (!booklet) {
        throw new NotFoundException(`Booklet [${dto.bookletId}] not found`);
      }

      if (student.gradeLevel && booklet.gradeLevel && student.gradeLevel !== booklet.gradeLevel) {
        throw new BadRequestException({
          code: 'BOOKLET_GRADE_MISMATCH',
          message: 'هذه المذكرة غير مخصصة للصف الدراسي لهذا الطالب',
          details: {
            studentId: student.id,
            studentGradeLevel: student.gradeLevel,
            bookletId: booklet.id,
            bookletGradeLevel: booklet.gradeLevel,
          },
        });
      }

      if (booklet.groupId) {
        const studentGroupIds = student.groupEnrollments?.map((e) => e.groupId) || [];
        if (!studentGroupIds.includes(booklet.groupId)) {
          throw new BadRequestException(
            'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
          );
        }
      }

      const amountExpected = Number(booklet.price);
      const amountPaid = dto.amountPaid !== undefined ? dto.amountPaid : amountExpected;
      const resolvedGroupId = dto.groupId || booklet.groupId || (student.groupEnrollments[0]?.groupId || null);

      const { payment, isDuplicate } = await this.runInTransaction(async (tx) => {
        const existingPayment = await tx.studentPaymentRecord.findFirst({
          where: {
            studentId: student.id,
            bookletId: dto.bookletId,
            paymentType: PaymentType.BOOKLET,
          },
          include: {
            student: {
              include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
            },
            group: { select: { id: true, name: true } },
            booklet: { select: { id: true, title: true, price: true } },
          },
        });

        const isDuplicateBooklet = !!(
          existingPayment &&
          existingPayment.paymentStatus === PaymentStatus.PAID &&
          Number(existingPayment.amountPaid) >= amountExpected
        );

        if (existingPayment) {
          if (isDuplicateBooklet) {
            return { payment: existingPayment, isDuplicate: true };
          } else {
            const updated = await tx.studentPaymentRecord.update({
              where: { id: existingPayment.id },
              data: {
                amountPaid,
                amountExpected,
                paymentStatus: PaymentStatus.PAID,
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
            return { payment: updated, isDuplicate: false };
          }
        } else {
          const created = await tx.studentPaymentRecord.create({
            data: {
              studentId: student.id,
              groupId: resolvedGroupId,
              bookletId: dto.bookletId,
              paymentType: PaymentType.BOOKLET,
              periodYear,
              periodMonth,
              amountExpected,
              amountPaid,
              currency: 'EGP',
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: dto.paymentMethod || 'CASH',
              receiptNumber: dto.receiptNumber,
              notes: dto.notes || `سداد مذكرة: ${booklet.title}`,
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

          if (booklet.stockCount !== null && booklet.stockCount > 0) {
            await tx.booklet.update({
              where: { id: booklet.id },
              data: { stockCount: { decrement: 1 } },
            });
          }

          return { payment: created, isDuplicate: false };
        }
      });

      if (!isDuplicate) {
        this.eventEmitter.emit('payment.recorded', {
          studentId: student.id,
          studentName: student.user.fullName,
          parentPhone: student.user.phone,
          paymentType: 'BOOKLET',
          bookletId: dto.bookletId,
          bookletTitle: booklet.title,
          amountPaid: Number(payment.amountPaid),
          periodYear,
          periodMonth,
        });
      }

      this.logger.log(
        `QR Booklet Payment processed: Student [${student.user.fullName}], Booklet [${booklet.title}], Paid: ${amountPaid} EGP (Duplicate: ${isDuplicate})`,
      );

      if (this.redisCache) {
        await this.redisCache.del(`student:dashboard:${student.id}`);
        await this.redisCache.del(`parent:overview:${student.id}`);
      }

      return {
        success: true,
        isDuplicate,
        message: isDuplicate
          ? `تم تحديث سداد مذكرة "${booklet.title}" للطالب ${student.user.fullName} (مسجل مسبقاً)`
          : `تم تسجيل سداد مذكرة "${booklet.title}" للطالب ${student.user.fullName} بنجاح`,
        payment,
        student: {
          id: student.id,
          fullName: student.user.fullName,
          phone: student.user.phone,
        },
        booklet: {
          id: booklet.id,
          title: booklet.title,
          price: Number(booklet.price),
        },
        group: booklet.group ? { id: booklet.group.id, name: booklet.group.name } : null,
      };
    }

    // Flow B: QR Tuition Payment
    let targetGroup: { id: string; name: string; monthlyFee: any; teacherId: string } | null = null;
    let targetEnrollment: any = null;

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
      targetEnrollment = student.groupEnrollments.find((e) => e.groupId === group.id);
    } else {
      let eligibleEnrollments = student.groupEnrollments;
      if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        eligibleEnrollments = student.groupEnrollments.filter(
          (e) => e.group.teacherId === teacherId || e.group.teacherId === user.id,
        );
      }

      if (eligibleEnrollments.length > 0) {
        targetGroup = eligibleEnrollments[0].group;
        targetEnrollment = eligibleEnrollments[0];
      }
    }

    let defaultExpected = targetGroup ? Number(targetGroup.monthlyFee) : 0;
    if (targetGroup && targetEnrollment?.enrolledAt) {
      if (isEnrolledInPeriod(targetEnrollment.enrolledAt, periodYear, periodMonth)) {
        defaultExpected = calculateProratedTuition(Number(targetGroup.monthlyFee), new Date(targetEnrollment.enrolledAt)).expectedAmount;
      } else if (isPeriodBeforeEnrollment(targetEnrollment.enrolledAt, periodYear, periodMonth)) {
        defaultExpected = 0;
      }
    }
    const amountExpected = defaultExpected;
    const amountPaid = dto.amountPaid !== undefined ? dto.amountPaid : amountExpected;

    const { payment, isDuplicate } = await this.runInTransaction(async (tx) => {
      const existingPayment = await tx.studentPaymentRecord.findFirst({
        where: {
          studentId: student.id,
          groupId: targetGroup ? targetGroup.id : null,
          periodYear,
          periodMonth,
          paymentType: PaymentType.TUITION,
        },
        include: {
          student: {
            include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
          },
          group: { select: { id: true, name: true } },
          booklet: { select: { id: true, title: true, price: true } },
        },
      });

      const isDuplicatePayment = !!(
        existingPayment &&
        existingPayment.paymentStatus === PaymentStatus.PAID &&
        Number(existingPayment.amountPaid) >= amountExpected
      );

      if (existingPayment) {
        if (isDuplicatePayment) {
          return { payment: existingPayment, isDuplicate: true };
        } else {
          const updated = await tx.studentPaymentRecord.update({
            where: { id: existingPayment.id },
            data: {
              amountPaid,
              amountExpected,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: dto.paymentMethod || 'CASH',
              receiptNumber: dto.receiptNumber,
              notes: dto.notes || 'تم السداد عبر مسح رمز الـ QR',
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
          return { payment: updated, isDuplicate: false };
        }
      } else {
        const created = await tx.studentPaymentRecord.create({
          data: {
            studentId: student.id,
            groupId: targetGroup ? targetGroup.id : null,
            paymentType: PaymentType.TUITION,
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
          include: {
            student: {
              include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
            },
            group: { select: { id: true, name: true } },
            booklet: { select: { id: true, title: true, price: true } },
          },
        });
        return { payment: created, isDuplicate: false };
      }
    });

    if (!isDuplicate) {
      this.eventEmitter.emit('payment.recorded', {
        studentId: student.id,
        studentName: student.user.fullName,
        parentPhone: student.user.phone,
        groupName: targetGroup ? targetGroup.name : 'عام',
        paymentType: 'TUITION',
        amountPaid: Number(payment.amountPaid),
        periodYear,
        periodMonth,
      });
    }

    this.logger.log(
      `QR Payment processed: Student [${student.user.fullName}], Period ${periodMonth}/${periodYear}, Paid: ${amountPaid} EGP (Duplicate: ${isDuplicate})`,
    );

    if (this.redisCache) {
      setImmediate(() => {
        Promise.allSettled([
          this.redisCache?.del(`student:dashboard:${student.id}`),
          this.redisCache?.del(`parent:overview:${student.id}`),
        ]).catch(() => {});
      });
    }

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
}
