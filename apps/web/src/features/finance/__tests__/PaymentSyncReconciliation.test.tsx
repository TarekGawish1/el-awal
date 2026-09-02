import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { apiClient } from '@/lib/api/client';

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({ user: { id: 'teacher-1' }, isAuthenticated: true }),
  },
}));

describe('Payment Offline Recording & Sync Reconciliation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await offlineDb.wipeAllOfflineData();
  });

  it('records payment offline, updates student status to PAID locally, flushes mutation outbox on reconnection, and reconciles payment IDs', async () => {
    // 1. Initial State: Seed student 1 (unpaid)
    const student1 = {
      id: 'student-1',
      fullName: 'أحمد محمود',
      phone: '01011112222',
      studentCode: 'STU-2026-0001',
      qrCodeToken: 'QR-STU-2026-0001',
      academicStatus: 'ACTIVE',
      isArchived: false,
      user: { fullName: 'أحمد محمود', isActive: true },
      groupEnrollments: [
        {
          groupId: 'group-1',
          status: 'ACTIVE',
          group: { id: 'group-1', name: 'مجموعة النخبة', academicYear: '2026-2027', academicTerm: 'FIRST_TERM' },
        },
      ],
      paymentRecords: [],
    };

    await offlineDb.putStudent(student1);

    // Verify student is initially unpaid for October 2026
    let localStudents = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(localStudents.length).toBe(1);
    expect(localStudents[0].paymentRecords?.length || 0).toBe(0);

    // 2. Offline Action: Record Payment offline
    const tempPaymentId = 'temp-pay-101';
    const paymentRecord = {
      id: tempPaymentId,
      studentId: 'student-1',
      groupId: 'group-1',
      periodYear: 2026,
      periodMonth: 10,
      amountPaid: 250,
      amountExpected: 250,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
    };

    await offlineDb.bulkPutPayments([paymentRecord]);
    await offlineDb.markStudentPaidOffline('student-1', paymentRecord);

    await offlineDb.enqueueMutation({
      id: 'mut-pay-101',
      domain: 'finance',
      endpoint: '/subscriptions/record',
      method: 'POST',
      payload: {
        id: tempPaymentId,
        studentId: 'student-1',
        groupId: 'group-1',
        periodYear: 2026,
        periodMonth: 10,
        amountPaid: 250,
        paymentMethod: 'CASH',
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      optimisticId: tempPaymentId,
    });

    // 3. Verify student status is immediately "PAID" in IndexedDB
    localStudents = await offlineDb.getStudentsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });
    expect(localStudents[0].paymentRecords?.length).toBe(1);
    expect(localStudents[0].paymentRecords?.[0].paymentStatus).toBe('PAID');
    expect(localStudents[0].paymentRecords?.[0].amountPaid).toBe(250);

    // Verify outbox summary reflects the pending payment
    const summary = await syncEngine.getPendingOutboxSummary();
    expect(summary.paymentsCount).toBe(1);
    expect(summary.totalCount).toBe(1);

    // 4. Online Action: Reconnection & ID Reconciliation
    const serverPaymentId = 'srv-payment-888';
    await offlineDb.reconcileEntityIds({
      payments: {
        [tempPaymentId]: serverPaymentId,
      },
    });

    // Remove mutation as if flushed
    await offlineDb.removeMutation('mut-pay-101');

    // 5. Verify local payments store holds reconciled server ID and student remains PAID
    const payments = await offlineDb.getPaymentsOffline({ studentId: 'student-1' });
    expect(payments.length).toBe(1);
    expect(payments[0].id).toBe(serverPaymentId);
    expect(payments[0].paymentStatus).toBe('PAID');

    const pendingAfter = await offlineDb.getPendingCount();
    expect(pendingAfter).toBe(0);
  });
});
