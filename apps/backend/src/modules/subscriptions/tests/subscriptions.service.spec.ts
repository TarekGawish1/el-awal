import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionsService } from '../services/subscriptions.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentStatus, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockUser: AuthenticatedUser = {
    id: 'staff-1',
    role: UserRole.SECRETARIAT,
  };

  const mockPrismaService = {
    studentProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    academicGroup: {
      findUnique: jest.fn(),
    },
    booklet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    studentPaymentRecord: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    groupEnrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('recordStudentPayment', () => {
    it('should record payment and emit payment.recorded domain event', async () => {
      const studentId = 'stu-1';
      const groupId = 'group-1';

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: studentId,
        user: { fullName: 'محمود أحمد' },
      });

      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: groupId,
        name: 'مجموعة أ',
        monthlyFee: 400.0,
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue({
        groupId,
        studentId,
        status: GroupEnrollmentStatus.ACTIVE,
      });

      const mockPayment = {
        id: 'payment-1',
        studentId,
        groupId,
        periodYear: 2026,
        periodMonth: 9,
        amountExpected: 400.0,
        amountPaid: 400.0,
        paymentStatus: PaymentStatus.PAID,
      };

      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.studentPaymentRecord.create.mockResolvedValue(mockPayment);

      const result = await service.recordStudentPayment(mockUser, {
        studentId,
        groupId,
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 400.0,
        paymentStatus: PaymentStatus.PAID,
      });

      expect(result.id).toBe('payment-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.recorded',
        expect.objectContaining({
          studentId,
          amountPaid: 400.0,
          periodYear: 2026,
          periodMonth: 9,
        }),
      );
    });

    it('should record booklet payment when paymentType is BOOKLET', async () => {
      const studentId = 'stu-1';
      const bookletId = 'booklet-1';

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: studentId,
        user: { fullName: 'محمود أحمد' },
      });

      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: bookletId,
        title: 'مذكرة الشرح',
        price: 85.0,
        stockCount: 10,
        groupId: null,
      });

      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.studentPaymentRecord.create.mockResolvedValue({
        id: 'pay-booklet-1',
        studentId,
        bookletId,
        amountPaid: 85.0,
        amountExpected: 85.0,
        paymentStatus: PaymentStatus.PAID,
      });

      const result = await service.recordStudentPayment(mockUser, {
        studentId,
        paymentType: 'BOOKLET',
        bookletId,
        amountPaid: 85.0,
      });

      expect(result.id).toBe('pay-booklet-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.recorded',
        expect.objectContaining({
          studentId,
          paymentType: 'BOOKLET',
          bookletTitle: 'مذكرة الشرح',
          amountPaid: 85.0,
        }),
      );
    });

    it('should throw BadRequestException when booklet gradeLevel does not match student gradeLevel', async () => {
      const studentId = 'stu-1';
      const bookletId = 'booklet-diff-grade';

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: studentId,
        gradeLevel: 'الصف الأول الثانوي',
        user: { fullName: 'محمود أحمد' },
        groupEnrollments: [{ groupId: 'grp-1' }],
      });

      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: bookletId,
        title: 'مذكرة كيمياء تالتة ثانوي',
        gradeLevel: 'الصف الثالث الثانوي',
        price: 90.0,
        stockCount: 10,
        groupId: null,
      });

      await expect(
        service.recordStudentPayment(mockUser, {
          studentId,
          paymentType: 'BOOKLET',
          bookletId,
          amountPaid: 90.0,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'BOOKLET_GRADE_MISMATCH',
          details: {
            studentId,
            studentGradeLevel: 'الصف الأول الثانوي',
            bookletId,
            bookletGradeLevel: 'الصف الثالث الثانوي',
          },
        }),
      });
    });

    it('should throw BadRequestException when student is not enrolled in booklet group', async () => {
      const studentId = 'stu-1';
      const bookletId = 'booklet-diff-group';

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: studentId,
        gradeLevel: 'الصف الأول الثانوي',
        user: { fullName: 'محمود أحمد' },
        groupEnrollments: [{ groupId: 'grp-1' }],
      });

      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: bookletId,
        title: 'مذكرة مجموعة المتفوقين',
        gradeLevel: 'الصف الأول الثانوي',
        price: 70.0,
        stockCount: 10,
        groupId: 'grp-special-2',
      });

      await expect(
        service.recordStudentPayment(mockUser, {
          studentId,
          paymentType: 'BOOKLET',
          bookletId,
          amountPaid: 70.0,
        }),
      ).rejects.toThrow('INVALID_BOOKLET_FOR_STUDENT');
    });
  });

  describe('deleteStudentPayment', () => {
    it('should delete the StudentPaymentRecord in PostgreSQL', async () => {
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue({
        id: 'payment-to-delete',
        studentId: 'stu-1',
        group: { teacherId: 'staff-1' },
      });
      mockPrismaService.studentPaymentRecord.delete.mockResolvedValue({ id: 'payment-to-delete' });

      const result = await service.deleteStudentPayment('payment-to-delete', mockUser);

      expect(mockPrismaService.studentPaymentRecord.delete).toHaveBeenCalledWith({
        where: { id: 'payment-to-delete' },
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when the payment record does not exist', async () => {
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteStudentPayment('missing-id', mockUser),
      ).rejects.toThrow('not found');
      expect(mockPrismaService.studentPaymentRecord.delete).not.toHaveBeenCalled();
    });

    it('should forbid a teacher from deleting a payment belonging to a group they do not own', async () => {
      const teacherUser: AuthenticatedUser = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-profile-1',
      } as any;

      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue({
        id: 'payment-1',
        studentId: 'stu-1',
        group: { teacherId: 'someone-else' },
      });

      await expect(
        service.deleteStudentPayment('payment-1', teacherUser),
      ).rejects.toThrow('You do not own the academic group for this payment');
      expect(mockPrismaService.studentPaymentRecord.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStudentPaymentHistory (cross-device financial ledger verification)', () => {
    it('surfaces a booklet purchase synced from another device in the student transaction history', async () => {
      const studentId = 'stu-cross-device-1';

      // Simulates a booklet payment that was persisted to PostgreSQL by a DIFFERENT
      // device/session (e.g. via SyncService.syncPaymentsBatch while offline elsewhere).
      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([
        {
          id: 'pay-cross-device-1',
          studentId,
          groupId: null,
          paymentType: 'BOOKLET',
          bookletId: 'booklet-cross-1',
          periodYear: 2026,
          periodMonth: 9,
          amountExpected: 95,
          amountPaid: 95,
          currency: 'EGP',
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: 'CASH',
          createdAt: new Date().toISOString(),
          group: null,
          booklet: { id: 'booklet-cross-1', title: 'مذكرة الرياضيات الشاملة', price: 95 },
          recordedBy: { fullName: 'مدرس آخر' },
        },
      ]);

      const history = await service.getStudentPaymentHistory(studentId, mockUser);

      expect(mockPrismaService.studentPaymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId } }),
      );
      expect(history).toHaveLength(1);
      expect(history[0].paymentType).toBe('BOOKLET');
      expect(history[0].booklet?.title).toBe('مذكرة الرياضيات الشاملة');
      expect(history[0].amountPaid).toBe(95);
    });
  });

  describe('getGroupDefaulters', () => {
    it('should return list of students who have not paid for the billing period', async () => {
      const groupId = 'group-1';

      mockPrismaService.academicGroup.findUnique.mockResolvedValue({
        id: groupId,
        name: 'مجموعة أ',
        monthlyFee: 450.0,
      });

      mockPrismaService.groupEnrollment.findMany.mockResolvedValue([
        {
          studentId: 'stu-1',
          status: GroupEnrollmentStatus.ACTIVE,
          student: {
            id: 'stu-1',
            studentCode: 'STU-001',
            gradeLevel: 'الصف الثالث',
            user: { fullName: 'طالب 1', phone: '0101' },
            parentLinks: [],
          },
        },
        {
          studentId: 'stu-2',
          status: GroupEnrollmentStatus.ACTIVE,
          student: {
            id: 'stu-2',
            studentCode: 'STU-002',
            gradeLevel: 'الصف الثالث',
            user: { fullName: 'طالب 2', phone: '0102' },
            parentLinks: [],
          },
        },
      ]);

      mockPrismaService.studentPaymentRecord.findMany.mockResolvedValue([
        { studentId: 'stu-1' }, // stu-1 paid
      ]);

      const result = await service.getGroupDefaulters(groupId, 2026, 9, mockUser);

      expect(result.totalEnrolled).toBe(2);
      expect(result.totalDefaulters).toBe(1);
      expect(result.defaulters[0].studentId).toBe('stu-2');
    });
  });

  describe('scanPaymentQr', () => {
    it('should resolve student from qrCodeToken and record payment', async () => {
      const qrCodeToken = 'qr_tok_valid_student_123';
      const studentId = 'stu-1';
      const groupId = 'group-1';

      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: studentId,
        qrCodeToken,
        user: { fullName: 'طالب ماسح', phone: '01012345678', isActive: true },
        groupEnrollments: [
          {
            groupId,
            status: GroupEnrollmentStatus.ACTIVE,
            group: { id: groupId, name: 'مجموعة النجوم', monthlyFee: 350.0, teacherId: 'teacher-1' },
          },
        ],
      });

      mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValue(null);

      const mockPayment = {
        id: 'payment-qr-1',
        studentId,
        groupId,
        periodYear: 2026,
        periodMonth: 8,
        amountExpected: 350.0,
        amountPaid: 350.0,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
        notes: 'تم السداد عبر مسح رمز الـ QR',
      };

      mockPrismaService.studentPaymentRecord.create.mockResolvedValue(mockPayment);

      const result = await service.scanPaymentQr(mockUser, {
        qrCodeToken,
        periodYear: 2026,
        periodMonth: 8,
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.student.fullName).toBe('طالب ماسح');
      expect(result.group?.name).toBe('مجموعة النجوم');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.recorded',
        expect.objectContaining({
          studentId,
          amountPaid: 350.0,
          periodYear: 2026,
          periodMonth: 8,
        }),
      );
    });

    it('should throw a structured validation error when booklet gradeLevel does not match student in scanPaymentQr', async () => {
      const qrCodeToken = 'qr_tok_student_grade_1';
      const studentId = 'stu-grade-1';
      const bookletId = 'booklet-grade-2';

      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: studentId,
        qrCodeToken,
        gradeLevel: 'الصف الأول الثانوي',
        user: { fullName: 'طالب أولى ثانوي', phone: '01012345678', isActive: true },
        groupEnrollments: [],
      });

      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: bookletId,
        title: 'مذكرة تانية ثانوي',
        gradeLevel: 'الصف الثاني الثانوي',
        price: 70.0,
        stockCount: 5,
        groupId: null,
      });

      await expect(
        service.scanPaymentQr(mockUser, {
          qrCodeToken,
          paymentType: 'BOOKLET',
          bookletId,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'BOOKLET_GRADE_MISMATCH',
          details: {
            studentId,
            studentGradeLevel: 'الصف الأول الثانوي',
            bookletId,
            bookletGradeLevel: 'الصف الثاني الثانوي',
          },
        }),
      });
    });

    it('should throw BadRequestException when student is not enrolled in booklet group in scanPaymentQr', async () => {
      const qrCodeToken = 'qr_tok_student_grp_1';
      const studentId = 'stu-grp-1';
      const bookletId = 'booklet-grp-target';

      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        id: studentId,
        qrCodeToken,
        gradeLevel: 'الصف الأول الثانوي',
        user: { fullName: 'طالب مجموعة 1', phone: '01012345678', isActive: true },
        groupEnrollments: [{ groupId: 'grp-actual-1' }],
      });

      mockPrismaService.booklet.findUnique.mockResolvedValue({
        id: bookletId,
        title: 'مذكرة مجموعة 2 فقط',
        gradeLevel: 'الصف الأول الثانوي',
        price: 50.0,
        stockCount: 5,
        groupId: 'grp-target-2',
      });

      await expect(
        service.scanPaymentQr(mockUser, {
          qrCodeToken,
          paymentType: 'BOOKLET',
          bookletId,
        }),
      ).rejects.toThrow('INVALID_BOOKLET_FOR_STUDENT');
    });

    it('should throw BadRequestException for invalid or inactive student QR code', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.scanPaymentQr(mockUser, { qrCodeToken: 'invalid_token' }),
      ).rejects.toThrow('رمز الـ QR غير صالح أو أن حساب الطالب غير مفعّل.');
    });
  });

  describe('deleteStudentPayment', () => {
    it('should successfully delete a payment record and emit payment.deleted', async () => {
      const paymentId = 'pay-to-delete-1';
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue({
        id: paymentId,
        studentId: 'stu-1',
        amountPaid: 350,
        periodYear: 2026,
        periodMonth: 9,
        paymentType: 'TUITION',
        group: { id: 'grp-1', teacherId: 'staff-1' },
        student: { user: { fullName: 'طالب للتجربة' } },
      });
      mockPrismaService.studentPaymentRecord.delete.mockResolvedValue({ id: paymentId });

      const result = await service.deleteStudentPayment(paymentId, mockUser);
      expect(result.success).toBe(true);
      expect(mockPrismaService.studentPaymentRecord.delete).toHaveBeenCalledWith({
        where: { id: paymentId },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.deleted',
        expect.objectContaining({ paymentId, studentId: 'stu-1' }),
      );
    });

    it('should throw NotFoundException if payment to delete does not exist', async () => {
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue(null);

      await expect(service.deleteStudentPayment('non-existent', mockUser)).rejects.toThrow(
        'Payment record [non-existent] not found',
      );
    });
  });

  describe('refundStudentPayment', () => {
    it('should mark paymentStatus as REFUNDED and emit payment.refunded', async () => {
      const paymentId = 'pay-to-refund-1';
      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue({
        id: paymentId,
        studentId: 'stu-1',
        amountPaid: 350,
        periodYear: 2026,
        periodMonth: 9,
        paymentType: 'TUITION',
        group: { id: 'grp-1', teacherId: 'staff-1' },
        student: { user: { fullName: 'طالب للتجربة', phone: '01012345678' } },
      });
      mockPrismaService.studentPaymentRecord.update.mockResolvedValue({
        id: paymentId,
        paymentStatus: PaymentStatus.REFUNDED,
        notes: '[تم استرداد المبلغ]: الطالب يريد استرجاع المصروفات',
      });

      const result = await service.refundStudentPayment(
        paymentId,
        { reason: 'الطالب يريد استرجاع المصروفات' },
        mockUser,
      );
      expect(result.success).toBe(true);
      expect(mockPrismaService.studentPaymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentId },
          data: expect.objectContaining({ paymentStatus: PaymentStatus.REFUNDED }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.refunded',
        expect.objectContaining({
          paymentId,
          amountRefunded: 350,
          reason: 'الطالب يريد استرجاع المصروفات',
        }),
      );
    });
  });
});

