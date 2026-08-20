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
    studentPaymentRecord: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

      mockPrismaService.studentPaymentRecord.upsert.mockResolvedValue(mockPayment);

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

      mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValue(null);

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

      mockPrismaService.studentPaymentRecord.upsert.mockResolvedValue(mockPayment);

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

    it('should throw BadRequestException for invalid or inactive student QR code', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.scanPaymentQr(mockUser, { qrCodeToken: 'invalid_token' }),
      ).rejects.toThrow('رمز الـ QR غير صالح أو أن حساب الطالب غير مفعّل.');
    });
  });
});

