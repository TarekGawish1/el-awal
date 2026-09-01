import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../services/sync.service';
import { CoursesService } from '../../courses/services/courses.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentType, PaymentStatus } from '@prisma/client';

describe('SyncService - Offline Payments Duplicate Prevention', () => {
  let syncService: SyncService;
  let prisma: PrismaService;
  
  // Mocks
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindUnique = jest.fn();
  const mockFindFirst = jest.fn();
  const mockBookletFindUnique = jest.fn();
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // We only need to mock the tx.studentPaymentRecord methods used in syncPaymentsBatch
    const prismaMock = {
      $transaction: jest.fn(async (callback) => {
        return callback({
          studentPaymentRecord: {
            create: mockCreate,
            update: mockUpdate,
            findUnique: mockFindUnique,
            findFirst: mockFindFirst,
          },
          academicGroup: {
            findUnique: jest.fn().mockResolvedValue({ monthlyFee: 500 }),
          },
          studentProfile: {
            findUnique: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'group-1', groupEnrollments: [{ groupId: 'group-1' }] }),
          },
          groupEnrollment: {
            updateMany: jest.fn(),
          },
          booklet: {
            findUnique: mockBookletFindUnique,
          }
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CoursesService, useValue: { findByCode: jest.fn() } },
      ],
    }).compile();

    syncService = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  const baseOp = {
    id: 'test-op-1',
    clientTempId: 'client-temp-1',
    studentId: 'student-1',
    groupId: 'group-1',
    periodYear: 2026,
    periodMonth: 9,
    amountPaid: 500,
    amountExpected: 500,
    paymentMethod: 'CASH',
    currency: 'EGP',
    paymentDate: new Date().toISOString(),
  };

  const user = { id: 'recorder-1', role: 'SECRETARY' as any };

  it('1. First tuition payment succeeds', async () => {
    mockFindUnique.mockResolvedValueOnce(null); // No existing op
    mockFindFirst.mockResolvedValueOnce(null); // No existing payment
    
    mockCreate.mockResolvedValueOnce({ id: 'payment-1' });

    const result = await syncService.syncPaymentsBatch(user, { operations: [baseOp] } as any);
    
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 500,
        amountExpected: 500,
        paymentStatus: PaymentStatus.PAID,
      })
    }));
    expect(result.processedOperationIds).toContain('test-op-1');
  });

  it('2. Exact same operationId retries safely (Technical Idempotency)', async () => {
    // Return existing op to simulate a retry
    mockFindUnique.mockResolvedValueOnce({ id: 'payment-1', operationId: 'test-op-1' });
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await syncService.syncPaymentsBatch(user, { operations: [baseOp] } as any);
    
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.duplicatesIgnored).toBe(1);
    expect(result.processedOperationIds).toContain('test-op-1');
  });

  it('3. Two different offline operations for the same student/month (Business Duplicate)', async () => {
    // Simulating Device B syncing AFTER Device A synced successfully.
    // Existing payment is fully paid.
    mockFindUnique.mockResolvedValueOnce(null); // New operationId
    mockFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      amountPaid: 500,
      amountExpected: 500,
      paymentStatus: PaymentStatus.PAID,
    }); // Finds Device A's payment

    const deviceBOp = { ...baseOp, id: 'test-op-2' }; // Different technical ID

    const result = await syncService.syncPaymentsBatch(user, { operations: [deviceBOp] } as any);
    
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled(); // The fix should prevent this update!
    expect(result.duplicatesIgnored).toBe(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toContain('DUPLICATE_BUSINESS_PAYMENT');
  });

  it('4. Legitimate partial payment scenario', async () => {
    // Existing payment is only 200/500 (PENDING)
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      amountPaid: 200,
      amountExpected: 500,
      paymentStatus: PaymentStatus.PENDING,
    });

    // Offline device sends another 300
    const partialOp = { ...baseOp, id: 'test-op-3', amountPaid: 300, amountExpected: 500 };
    mockUpdate.mockResolvedValueOnce({ id: 'payment-1' });

    const result = await syncService.syncPaymentsBatch(user, { operations: [partialOp] } as any);
    
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        amountPaid: 500, // 200 + 300
        amountExpected: 500,
        paymentStatus: PaymentStatus.PAID,
      })
    }));
  });

  it('5. Overpayment scenario (Partial on fully paid)', async () => {
    // Existing payment is 500/500 (PAID)
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      amountPaid: 500,
      amountExpected: 500,
      paymentStatus: PaymentStatus.PAID,
    });

    // Offline device sends 100 extra (not a full payment attempt)
    const overOp = { ...baseOp, id: 'test-op-4', amountPaid: 100, amountExpected: 500 };
    mockUpdate.mockResolvedValueOnce({ id: 'payment-1' });

    const result = await syncService.syncPaymentsBatch(user, { operations: [overOp] } as any);
    
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        amountPaid: 600, // 500 + 100
        amountExpected: 500,
        paymentStatus: PaymentStatus.PAID, // remains PAID
      })
    }));
  });

  it('6. Server fee beats stale client fee', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce(null);

    // Server expects 500 (mocked in beforeEach)
    // Client sends 350
    const staleOp = { ...baseOp, id: 'test-op-5', amountPaid: 350, amountExpected: 350 };
    mockCreate.mockResolvedValueOnce({ id: 'payment-5' });

    await syncService.syncPaymentsBatch(user, { operations: [staleOp] } as any);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 350, // Preserved
        amountExpected: 500, // Corrected by server
        paymentStatus: PaymentStatus.PENDING,
      })
    }));
  });

  it('7. Stale client fee + full server amount', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce(null);

    // Server expects 500. Client thinks it's 350 but sends 500.
    const staleOp = { ...baseOp, id: 'test-op-6', amountPaid: 500, amountExpected: 350 };
    mockCreate.mockResolvedValueOnce({ id: 'payment-6' });

    await syncService.syncPaymentsBatch(user, { operations: [staleOp] } as any);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 500,
        amountExpected: 500,
        paymentStatus: PaymentStatus.PAID,
      })
    }));
  });

  it('8. Explicit zero payment is preserved', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce(null);

    // Explicitly sending 0
    const zeroOp = { ...baseOp, id: 'test-op-7', amountPaid: 0, amountExpected: 500 };
    mockCreate.mockResolvedValueOnce({ id: 'payment-7' });

    await syncService.syncPaymentsBatch(user, { operations: [zeroOp] } as any);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 0, // MUST REMAIN 0, NOT 500
        amountExpected: 500,
        paymentStatus: PaymentStatus.PENDING,
      })
    }));
  });

  it('9. Missing amount fallback to default', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindFirst.mockResolvedValueOnce(null);

    // No amount provided
    const missingOp = { ...baseOp, id: 'test-op-8', amountPaid: undefined, amountExpected: undefined, amount: undefined };
    mockCreate.mockResolvedValueOnce({ id: 'payment-8' });

    await syncService.syncPaymentsBatch(user, { operations: [missingOp] } as any);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 500, // Fell back to server expected
        amountExpected: 500,
        paymentStatus: PaymentStatus.PAID,
      })
    }));
  });

  it('10. Booklet stale price resolution', async () => {
    mockFindUnique.mockResolvedValueOnce(null); // op
    mockBookletFindUnique.mockResolvedValueOnce({ id: 'booklet-1', price: 100, groupId: 'group-1' }); // booklet
    mockFindFirst.mockResolvedValueOnce(null); // existing payment

    // Client expects 50, Server expects 100
    const bookletOp = { 
      id: 'test-op-9', 
      clientTempId: 'ct-9',
      studentId: 'student-1',
      groupId: 'group-1',
      bookletId: 'booklet-1', 
      amountPaid: 50, 
      amountExpected: 50,
      paymentType: 'BOOKLET',
    };
    mockCreate.mockResolvedValueOnce({ id: 'payment-9' });

    const result = await syncService.syncPaymentsBatch(user, { operations: [bookletOp] } as any);
    console.log("TEST 10 RESULT:", JSON.stringify(result, null, 2));

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amountPaid: 50, // Preserved incoming contribution
        amountExpected: 100, // Server corrected expected amount
        paymentStatus: PaymentStatus.PENDING,
      })
    }));
  });
});
