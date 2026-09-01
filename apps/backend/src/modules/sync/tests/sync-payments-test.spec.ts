import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { CoursesService } from '../../courses/services/courses.service';
import { AttendanceRepository } from '../../attendance/repositories/attendance.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SyncService - Payment Sync Integrity', () => {
  let syncService: SyncService;

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    studentProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 's-1', groupEnrollments: [] }),
    },
    academicGroup: {
      findUnique: jest.fn().mockResolvedValue({ id: 'g-1', monthlyFee: 350 }),
    },
    studentPaymentRecord: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    groupEnrollment: {
      updateMany: jest.fn(),
    },
  };

  const mockUser: any = {
    id: 't-1',
    role: UserRole.TEACHER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CoursesService, useValue: {} },
        { provide: AttendanceRepository, useValue: {} },
        { provide: EventEmitter2, useValue: {} },
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
  });

  it('rejects negative payment amounts', async () => {
    const res = await syncService.syncPaymentsBatch(mockUser, {
      operations: [
        {
          id: 'op-1',
          studentId: 's-1',
          amountPaid: -50,
        },
      ],
    });

    expect(res.failedCount).toBe(1);
    expect(res.conflicts[0].reason).toContain('Invalid payment amount');
    expect(mockPrismaService.studentPaymentRecord.create).not.toHaveBeenCalled();
  });

  it('handles partial payments correctly (increments)', async () => {
    mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValueOnce({
      id: 'p-1',
      amountPaid: 150,
      amountExpected: 350,
      paymentStatus: PaymentStatus.PENDING,
    });
    mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValueOnce(null); // No idempotent hit
    mockPrismaService.studentPaymentRecord.update.mockResolvedValueOnce({});

    const res = await syncService.syncPaymentsBatch(mockUser, {
      operations: [
        {
          id: 'op-2',
          studentId: 's-1',
          amountPaid: 100, // Pays 100 more
          groupId: 'g-1',
        },
      ],
    });

    expect(res.syncedCount).toBe(1);
    expect(mockPrismaService.studentPaymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          amountPaid: 250, // 150 + 100
          amountExpected: 350,
          paymentStatus: PaymentStatus.PENDING,
        }),
      }),
    );
  });

  it('marks as PAID if cumulative payment meets or exceeds expected', async () => {
    mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValueOnce({
      id: 'p-1',
      amountPaid: 150,
      amountExpected: 350,
      paymentStatus: PaymentStatus.PENDING,
    });
    mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValueOnce(null);

    await syncService.syncPaymentsBatch(mockUser, {
      operations: [{ id: 'op-3', studentId: 's-1', amountPaid: 200, groupId: 'g-1' }],
    });

    expect(mockPrismaService.studentPaymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: 350,
          paymentStatus: PaymentStatus.PAID,
        }),
      }),
    );
  });

  it('prevents client from faking PAID status if amount is insufficient', async () => {
    mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValueOnce(null);
    mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValueOnce(null);

    await syncService.syncPaymentsBatch(mockUser, {
      operations: [{ id: 'op-4', studentId: 's-1', amountPaid: 100, paymentStatus: PaymentStatus.PAID, groupId: 'g-1' }],
    });

    expect(mockPrismaService.studentPaymentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: 100,
          amountExpected: 350, // From group.monthlyFee mock
          paymentStatus: PaymentStatus.PENDING, // Override faked status
        }),
      }),
    );
  });

  it('ignores duplicate requests (idempotency)', async () => {
    mockPrismaService.studentPaymentRecord.findFirst.mockResolvedValueOnce({
      id: 'p-1',
      amountPaid: 350,
    });
    // This mocks the idempotency check finding an existing operationId
    mockPrismaService.studentPaymentRecord.findUnique.mockResolvedValueOnce({
      id: 'p-1',
      operationId: 'op-duplicate',
    });

    const res = await syncService.syncPaymentsBatch(mockUser, {
      operations: [{ id: 'op-duplicate', studentId: 's-1', amountPaid: 100, groupId: 'g-1' }],
    });

    expect(res.duplicatesIgnored).toBe(1);
    expect(res.syncedCount).toBe(0);
    expect(mockPrismaService.studentPaymentRecord.update).not.toHaveBeenCalled();
    expect(mockPrismaService.studentPaymentRecord.create).not.toHaveBeenCalled();
  });
});
