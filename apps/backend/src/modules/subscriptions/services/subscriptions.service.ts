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
import { CancelPaymentDto } from '../dto/cancel-payment.dto';
import { PaymentStatus, PaymentType, GroupEnrollmentStatus, UserRole } from '@prisma/client';
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

      // Grade level mismatch validation
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

      // Group scoping validation if booklet is tied to a specific group
      if (booklet.groupId) {
        const studentGroupIds = student.groupEnrollments?.map((e) => e.groupId) || [];
        if (!studentGroupIds.includes(booklet.groupId)) {
          throw new BadRequestException(
            'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
          );
        }
      }

      bookletTitle = booklet.title;
      if (amountExpected === undefined) {
        amountExpected = Number(booklet.price);
      }

      const resolvedGroupId = dto.groupId || booklet.groupId || null;

      // Check if student already paid for this booklet
      const existingBookletPayment = await this.prisma.studentPaymentRecord.findFirst({
        where: {
          studentId: dto.studentId,
          bookletId: dto.bookletId,
          paymentType: PaymentType.BOOKLET,
        },
      });

      let payment: any;
      if (existingBookletPayment) {
        const expected = Number(existingBookletPayment.amountExpected || amountExpected || 0);
        const previouslyPaid = Number(existingBookletPayment.amountPaid || 0);

        if (existingBookletPayment.paymentStatus === PaymentStatus.PAID || (expected > 0 && previouslyPaid >= expected)) {
          throw new BadRequestException('تم سداد قيمة هذه المذكرة لهذا الطالب مسبقاً بالكامل ولا يمكن تكرار الدفع!');
        }

        const cumulativePaid = previouslyPaid + Number(dto.amountPaid || 0);
        const isPaidInFull = (dto.paymentStatus === PaymentStatus.EXEMPT) || cumulativePaid >= expected;

        payment = await this.prisma.studentPaymentRecord.update({
          where: { id: existingBookletPayment.id },
          data: {
            amountPaid: cumulativePaid,
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
        payment = await this.prisma.studentPaymentRecord.create({
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

        // Decrement stock if tracked
        if (booklet.stockCount !== null && booklet.stockCount > 0) {
          await this.prisma.booklet.update({
            where: { id: booklet.id },
            data: { stockCount: { decrement: 1 } },
          });
        }
      }

      if (payment.paymentStatus === PaymentStatus.PAID) {
        const remaining = Math.max(0, Number(payment.amountExpected || 0) - Number(payment.amountPaid || 0));
        this.eventEmitter.emit('payment.recorded', {
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

      this.logger.log(
        `Booklet payment recorded: Student [${dto.studentId}], Booklet [${dto.bookletId} - ${bookletTitle}], Paid: ${dto.amountPaid} EGP`,
      );

      return payment;
    }

    // 2. Regular Monthly Tuition Payment Flow
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

    const existingPayment = await this.prisma.studentPaymentRecord.findFirst({
      where: {
        studentId: dto.studentId,
        groupId: dto.groupId ?? null,
        periodYear,
        periodMonth,
        paymentType: PaymentType.TUITION,
      },
    });

    let payment: any;
    if (existingPayment) {
      const exp = amountExpected !== undefined ? amountExpected : Number(existingPayment.amountExpected || 0);
      const paid = Number(dto.amountPaid);
      const isPaidInFull = (dto.paymentStatus === PaymentStatus.EXEMPT) || paid >= exp;

      payment = await this.prisma.studentPaymentRecord.update({
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

      payment = await this.prisma.studentPaymentRecord.create({
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

    // If payment is marked as PAID, dispatch asynchronous domain event
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

    return payment;
  }

  /**
   * Scans student QR code and automatically records the student tuition or booklet payment.
   */
  async scanPaymentQr(user: AuthenticatedUser, dto: ScanPaymentQrDto) {
    // 1. Resolve student by QR token, studentCode or UUID
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

      // Grade level mismatch validation
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

      // Group scoping validation if booklet is tied to a specific group
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

      // Check if student already purchased this booklet
      const existingPayment = await this.prisma.studentPaymentRecord.findFirst({
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

      const isDuplicate = !!(
        existingPayment &&
        existingPayment.paymentStatus === PaymentStatus.PAID &&
        Number(existingPayment.amountPaid) >= amountExpected
      );

      let payment: any;
      if (existingPayment) {
        if (isDuplicate) {
          payment = existingPayment;
        } else {
          payment = await this.prisma.studentPaymentRecord.update({
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
        }
      } else {
        payment = await this.prisma.studentPaymentRecord.create({
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
          await this.prisma.booklet.update({
            where: { id: booklet.id },
            data: { stockCount: { decrement: 1 } },
          });
        }
      }

      // CRITICAL: Only emit payment.recorded and send WhatsApp receipt if NOT duplicate
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

    const amountExpected = targetGroup ? Number(targetGroup.monthlyFee) : 0;
    const amountPaid = dto.amountPaid !== undefined ? dto.amountPaid : amountExpected;

    // 3. Check for previous payment in this period
    const existingPayment = await this.prisma.studentPaymentRecord.findFirst({
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

    const isDuplicate = !!(
      existingPayment &&
      existingPayment.paymentStatus === PaymentStatus.PAID &&
      Number(existingPayment.amountPaid) >= amountExpected
    );

    // 4. Upsert payment record
    let payment: any;
    if (existingPayment) {
      if (isDuplicate) {
        payment = existingPayment;
      } else {
        payment = await this.prisma.studentPaymentRecord.update({
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
      }
    } else {
      payment = await this.prisma.studentPaymentRecord.create({
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
    }

    // 5. Emit payment recorded event ONLY IF NOT A DUPLICATE
    // Do not notify parents or send duplicate WhatsApp receipts if student already paid!
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

    // 2. Find payment records for this billing period
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

    // 3. Check billing configuration and payment timing
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
      // POSTPAID: Due only after the month ends (past month)
      isPeriodDue = periodYear < currentYear || (periodYear === currentYear && periodMonth < currentMonth);
    } else {
      // PREPAID: Due immediately as soon as the month starts (current or past month)
      isPeriodDue = periodYear < currentYear || (periodYear === currentYear && periodMonth <= currentMonth);
    }

    const isMonthExcluded = excludedMonths.includes(periodMonth);

    // 4. Filter unpaid and partially paid students (only if period is due and not excluded)
    const defaulters = (!isPeriodDue || isMonthExcluded)
      ? []
      : enrollments
          .filter((e) => {
            const enrollmentDate = new Date(e.enrolledAt);
            const enrollYear = enrollmentDate.getFullYear();
            const enrollMonth = enrollmentDate.getMonth() + 1;
            const enrollDay = enrollmentDate.getDate();

            // 1. If period is before the student enrolled, do NOT ask him to pay!
            if (periodYear < enrollYear || (periodYear === enrollYear && periodMonth < enrollMonth)) {
              return false;
            }

            // 2. If enrolled in middle of month (> day 15), expect half month fee
            const isJoiningMonth = periodYear === enrollYear && periodMonth === enrollMonth;
            const expectedFee = isJoiningMonth && enrollDay > 15 ? Math.round(groupFee / 2) : groupFee;

            const record = paymentMap.get(e.studentId);
            if (!record) return true;
            const amountPaid = Number(record.amountPaid || 0);
            const isFullyPaid = (record.paymentStatus === PaymentStatus.PAID || record.paymentStatus === PaymentStatus.EXEMPT) && amountPaid >= expectedFee;
            return !isFullyPaid;
          })
      .map((e) => {
        const enrollmentDate = new Date(e.enrolledAt);
        const enrollYear = enrollmentDate.getFullYear();
        const enrollMonth = enrollmentDate.getMonth() + 1;
        const enrollDay = enrollmentDate.getDate();
        const isJoiningMonth = periodYear === enrollYear && periodMonth === enrollMonth;
        const expectedFee = isJoiningMonth && enrollDay > 15 ? Math.round(groupFee / 2) : groupFee;

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

    await this.prisma.studentPaymentRecord.delete({
      where: { id },
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

    const updatedPayment = await this.prisma.studentPaymentRecord.update({
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
