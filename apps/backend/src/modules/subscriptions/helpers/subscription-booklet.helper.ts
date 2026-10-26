import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

const logger = new Logger('SubscriptionBookletHelper');

export async function executeBookletPayment(
  prisma: PrismaService,
  eventEmitter: EventEmitter2,
  user: AuthenticatedUser,
  dto: RecordPaymentDto,
  student: {
    id: string;
    gradeLevel?: string | null;
    user: { fullName: string; phone?: string | null };
    groupEnrollments?: Array<{ groupId: string }>;
  },
  periodYear: number,
  periodMonth: number,
  initialAmountExpected: number | undefined,
  runInTransaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>,
  redisCache?: RedisCacheService,
) {
  if (!dto.bookletId) {
    throw new BadRequestException('معرف المذكرة مطلوب لسداد قيمة مذكرة');
  }

  const booklet = await prisma.booklet.findUnique({
    where: { id: dto.bookletId },
    include: { group: true },
  });

  if (!booklet) {
    throw new NotFoundException(`Booklet [${dto.bookletId}] not found`);
  }

  if (user.role === UserRole.TEACHER) {
    const teacherId = user.teacherProfileId || user.id;
    if (
      (booklet as any).teacherProfileId &&
      (booklet as any).teacherProfileId !== teacherId &&
      (booklet as any).teacherProfileId !== user.id
    ) {
      throw new ForbiddenException('You do not own the booklet for this payment');
    }
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

  const bookletTitle = booklet.title;
  const amountExpected = initialAmountExpected !== undefined ? initialAmountExpected : Number(booklet.price);
  const resolvedGroupId = dto.groupId || booklet.groupId || null;

  const payment = await runInTransaction(async (tx) => {
    const existingBookletPayment = await tx.studentPaymentRecord.findFirst({
      where: {
        studentId: dto.studentId,
        bookletId: dto.bookletId,
        paymentType: PaymentType.BOOKLET,
      },
    });

    if (existingBookletPayment) {
      const expected = Number(existingBookletPayment.amountExpected || amountExpected || 0);
      const previouslyPaid = Number(existingBookletPayment.amountPaid || 0);

      if (existingBookletPayment.paymentStatus === PaymentStatus.PAID || (expected > 0 && previouslyPaid >= expected)) {
        throw new BadRequestException('تم سداد قيمة هذه المذكرة لهذا الطالب مسبقاً بالكامل ولا يمكن تكرار الدفع!');
      }

      const additionalPaid = Number(dto.amountPaid || 0);
      const cumulativePaid = previouslyPaid + additionalPaid;
      const isPaidInFull = (dto.paymentStatus === PaymentStatus.EXEMPT) || cumulativePaid >= expected;

      return tx.studentPaymentRecord.update({
        where: { id: existingBookletPayment.id },
        data: {
          amountPaid: { increment: additionalPaid },
          amountExpected: expected,
          paymentStatus: isPaidInFull ? PaymentStatus.PAID : (dto.paymentStatus || PaymentStatus.PENDING),
          paymentMethod: dto.paymentMethod || 'CASH',
          receiptNumber: dto.receiptNumber || existingBookletPayment.receiptNumber,
          notes: dto.notes || existingBookletPayment.notes,
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
      const createdPayment = await tx.studentPaymentRecord.create({
        data: {
          studentId: dto.studentId,
          groupId: resolvedGroupId,
          bookletId: dto.bookletId,
          paymentType: PaymentType.BOOKLET,
          periodYear,
          periodMonth,
          amountExpected: amountExpected ?? 0,
          amountPaid: dto.amountPaid,
          currency: 'EGP',
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
          booklet: { select: { id: true, title: true, price: true } },
        },
      });

      if (booklet.stockCount !== null && booklet.stockCount > 0) {
        await tx.booklet.update({
          where: { id: booklet.id },
          data: { stockCount: { decrement: 1 } },
        });
      }

      return createdPayment;
    }
  });

  if (payment.paymentStatus === PaymentStatus.PAID) {
    const remaining = Math.max(0, Number(payment.amountExpected || 0) - Number(payment.amountPaid || 0));
    eventEmitter.emit('payment.recorded', {
      studentId: dto.studentId,
      studentName: student.user.fullName,
      paymentType: 'BOOKLET',
      bookletId: dto.bookletId,
      bookletTitle,
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

  logger.log(
    `Booklet payment recorded: Student [${dto.studentId}], Booklet [${dto.bookletId} - ${bookletTitle}], Paid: ${dto.amountPaid} EGP`,
  );

  if (redisCache) {
    await redisCache.del(`student:dashboard:${dto.studentId}`);
    await redisCache.del(`parent:overview:${dto.studentId}`);
  }

  return payment;
}
