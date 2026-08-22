import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { useScanPaymentQr, useRecordPayment } from '@/features/finance/hooks/useFinance';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { QrScanner } from '../components/QrScanner';

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onResult }: any) => (
    <div data-testid="mock-qr-scanner">
      <button
        onClick={() => onResult([{ rawValue: 'qr-student-101' }])}
        data-testid="simulate-scan-btn"
      >
        Scan Student 101
      </button>
    </div>
  ),
}));

describe('Offline QR Deduplication & Idempotency Engine', () => {
  let queryClient: QueryClient;
  let originalNavigatorOnLine: boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Clear offline stores
    const pending = await offlineDb.getPendingMutations();
    for (const p of pending) {
      await offlineDb.removeMutation(p.id);
    }

    // Set offline mode
    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    // Seed mock student in offline DB
    await offlineDb.bulkPutStudents([
      {
        id: 'stu-101',
        fullName: 'عمر خالد المنشاوي',
        studentCode: 'STU-101',
        qrCodeToken: 'qr-student-101',
        groupId: 'grp-phys-1',
        gradeLevel: 'الصف الأول الثانوي',
        academicStatus: 'ACTIVE',
        user: { fullName: 'عمر خالد المنشاوي', phone: '01012345678' },
      } as any,
    ]);

    await offlineDb.cacheRoster({
      groupId: 'grp-phys-1',
      groupName: 'مجموعة الفيزياء للثانوية',
      students: [
        {
          id: 'stu-101',
          fullName: 'عمر خالد المنشاوي',
          studentCode: 'STU-101',
          qrCodeToken: 'qr-student-101',
        },
      ],
      updatedAt: Date.now(),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('prevents duplicate attendance scans offline and only enqueues 1 mutation into outbox', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    // 1. First offline scan
    let scan1Result: any;
    await act(async () => {
      scan1Result = await result.current.mutateAsync({
        sessionId: 'session-2026-1',
        qrCodeToken: 'qr-student-101',
        allowCrossGroup: false,
      });
    });

    expect(scan1Result.isDuplicate).toBe(false);
    expect(scan1Result.isOfflineSaved).toBe(true);
    expect(scan1Result.student.fullName).toBe('عمر خالد المنشاوي');

    // Verify 1 mutation in outbox
    const pendingAfterFirst = await offlineDb.getPendingMutations();
    const attMutations1 = pendingAfterFirst.filter((m) => m.domain === 'attendance');
    expect(attMutations1).toHaveLength(1);
    expect(attMutations1[0].payload.sessionId).toBe('session-2026-1');
    expect(attMutations1[0].payload.studentId).toBe('stu-101');

    // 2. Second offline scan with the exact same badge for the same session
    let scan2Result: any;
    await act(async () => {
      scan2Result = await result.current.mutateAsync({
        sessionId: 'session-2026-1',
        qrCodeToken: 'qr-student-101',
        allowCrossGroup: false,
      });
    });

    // Expect duplicate flag and no second mutation queued
    expect(scan2Result.isDuplicate).toBe(true);
    expect(scan2Result.message).toContain('تم تسجيل حضور الطالب مسبقاً في هذه الحصة');

    const pendingAfterSecond = await offlineDb.getPendingMutations();
    const attMutations2 = pendingAfterSecond.filter((m) => m.domain === 'attendance');
    expect(attMutations2).toHaveLength(1); // Still exactly 1
  });

  it('prevents duplicate offline tuition payment scans for the same billing period', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

    // 1. First payment scan for September 2026
    let pay1Result: any;
    await act(async () => {
      pay1Result = await result.current.mutateAsync({
        qrCodeToken: 'qr-student-101',
        groupId: 'grp-phys-1',
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 350,
      });
    });

    expect(pay1Result.success).toBe(true);
    expect(pay1Result.isDuplicate).toBe(false);
    expect(pay1Result.isOfflineSaved).toBe(true);

    // Verify 1 payment in outbox
    const pendingAfterFirst = await offlineDb.getPendingMutations();
    const payMutations1 = pendingAfterFirst.filter((m) => m.domain === 'finance');
    expect(payMutations1).toHaveLength(1);
    expect(payMutations1[0].payload.periodMonth).toBe(9);

    // 2. Second payment scan for the same student in the same billing period (September 2026)
    let pay2Result: any;
    await act(async () => {
      pay2Result = await result.current.mutateAsync({
        qrCodeToken: 'qr-student-101',
        groupId: 'grp-phys-1',
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 350,
      });
    });

    expect(pay2Result.isDuplicate).toBe(true);
    expect(pay2Result.message).toContain('مسبقاً');

    // Verify outbox STILL has only 1 mutation
    const pendingAfterSecond = await offlineDb.getPendingMutations();
    const payMutations2 = pendingAfterSecond.filter((m) => m.domain === 'finance');
    expect(payMutations2).toHaveLength(1);
  });
});
