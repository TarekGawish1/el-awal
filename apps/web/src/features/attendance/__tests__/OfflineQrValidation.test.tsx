import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { useScanPaymentQr } from '@/features/finance/hooks/useFinance';
import { offlineDb } from '@/lib/offline/db';

describe('Offline Strict QR Validation & Database Entity Lookup Guards', () => {
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

    // Seed offline student entity
    await offlineDb.bulkPutStudents([
      {
        id: 'stu-valid-2026',
        fullName: 'أحمد محمود إبراهيم',
        studentCode: 'STU-2026-0099',
        qrCodeToken: 'qr_tok_valid_student_99',
        groupId: 'group-physics-1',
        gradeLevel: 'الصف الأول الثانوي',
        academicStatus: 'ACTIVE',
        user: { fullName: 'أحمد محمود إبراهيم', phone: '01099887766' },
      } as any,
    ]);

    await offlineDb.cacheRoster({
      groupId: 'group-physics-1',
      groupName: 'مجموعة الفيزياء للثانوية',
      students: [
        {
          id: 'stu-valid-2026',
          fullName: 'أحمد محمود إبراهيم',
          studentCode: 'STU-2026-0099',
          qrCodeToken: 'qr_tok_valid_student_99',
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

  describe('Attendance Scanner Offline Guards', () => {
    it('throws INVALID_QR_CODE, saves zero records, and queues zero mutations when scanning random URLs or arbitrary barcodes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

      const invalidPayloads = [
        'https://google.com',
        'LENOVO-SN-12345',
        'http://example.com/student',
        '1234567890123',
        JSON.stringify({ type: 'PRODUCT_BARCODE', id: '123' }),
      ];

      for (const invalidToken of invalidPayloads) {
        await expect(
          result.current.mutateAsync({
            sessionId: 'session-physics-1',
            qrCodeToken: invalidToken,
          }),
        ).rejects.toMatchObject({
          code: 'INVALID_QR_CODE',
          message: expect.stringContaining('لا يتبع منصة الأول'),
        });
      }

      // Verify ZERO attendance mutations queued
      const pendingMutations = await offlineDb.getPendingMutations();
      expect(pendingMutations.filter((m) => m.domain === 'attendance')).toHaveLength(0);
    });

    it('throws STUDENT_NOT_FOUND, saves zero records, and queues zero mutations when scanning valid token for non-existent student', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

      // Valid format token, but student is not in offline database
      const nonExistentPayload = JSON.stringify({
        type: 'STUDENT_QR',
        studentId: 'stu-non-existent-999',
        code: 'STU-2026-9999',
        token: 'qr_tok_non_existent_999',
      });

      await expect(
        result.current.mutateAsync({
          sessionId: 'session-physics-1',
          qrCodeToken: nonExistentPayload,
        }),
      ).rejects.toMatchObject({
        code: 'STUDENT_NOT_FOUND',
        message: expect.stringContaining('غير مسجلة في قاعدة البيانات المحلية'),
      });

      // Also test standard token format with non-existent student
      await expect(
        result.current.mutateAsync({
          sessionId: 'session-physics-1',
          qrCodeToken: 'qr_tok_unknown_student_xyz',
        }),
      ).rejects.toMatchObject({
        code: 'STUDENT_NOT_FOUND',
      });

      // Verify ZERO attendance mutations queued
      const pendingMutations = await offlineDb.getPendingMutations();
      expect(pendingMutations.filter((m) => m.domain === 'attendance')).toHaveLength(0);
    });

    it('successfully records attendance and enqueues mutation when scanning a valid existing student QR (JSON schema)', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

      const validJsonPayload = JSON.stringify({
        type: 'STUDENT_QR',
        studentId: 'stu-valid-2026',
        code: 'STU-2026-0099',
        token: 'qr_tok_valid_student_99',
      });

      let scanResult: any;
      await act(async () => {
        scanResult = await result.current.mutateAsync({
          sessionId: 'session-physics-1',
          qrCodeToken: validJsonPayload,
        });
      });

      expect(scanResult.isDuplicate).toBe(false);
      expect(scanResult.isOfflineSaved).toBe(true);
      expect(scanResult.student.id).toBe('stu-valid-2026');
      expect(scanResult.student.fullName).toBe('أحمد محمود إبراهيم');

      // Verify 1 mutation in outbox
      const pendingMutations = await offlineDb.getPendingMutations();
      const attendanceMutations = pendingMutations.filter((m) => m.domain === 'attendance');
      expect(attendanceMutations).toHaveLength(1);
      expect(attendanceMutations[0].payload.studentId).toBe('stu-valid-2026');
    });

    it('successfully records attendance and enqueues mutation when scanning a valid signed payload string', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

      let scanResult: any;
      await act(async () => {
        scanResult = await result.current.mutateAsync({
          sessionId: 'session-physics-1',
          qrCodeToken: 'ELAWAL:STU:stu-valid-2026:qr_tok_valid_student_99',
        });
      });

      expect(scanResult.isDuplicate).toBe(false);
      expect(scanResult.isOfflineSaved).toBe(true);
      expect(scanResult.student.id).toBe('stu-valid-2026');
      expect(scanResult.student.fullName).toBe('أحمد محمود إبراهيم');
    });
  });

  describe('Finance Payment Scanner Offline Guards', () => {
    it('throws INVALID_QR_CODE and queues zero mutations when scanning random barcodes for payment', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

      await expect(
        result.current.mutateAsync({
          qrCodeToken: 'https://random-url.com',
          groupId: 'group-physics-1',
          periodYear: 2026,
          periodMonth: 8,
          amountPaid: 400,
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_QR_CODE',
      });

      const pending = await offlineDb.getPendingMutations();
      expect(pending.filter((m) => m.domain === 'finance')).toHaveLength(0);
    });

    it('throws STUDENT_NOT_FOUND and queues zero mutations when scanning unknown student token for payment', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

      await expect(
        result.current.mutateAsync({
          qrCodeToken: 'qr_tok_ghost_student_404',
          groupId: 'group-physics-1',
          periodYear: 2026,
          periodMonth: 8,
          amountPaid: 400,
        }),
      ).rejects.toMatchObject({
        code: 'STUDENT_NOT_FOUND',
      });

      const pending = await offlineDb.getPendingMutations();
      expect(pending.filter((m) => m.domain === 'finance')).toHaveLength(0);
    });

    it('successfully records payment offline for valid existing student', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

      let payResult: any;
      await act(async () => {
        payResult = await result.current.mutateAsync({
          qrCodeToken: 'qr_tok_valid_student_99',
          groupId: 'group-physics-1',
          periodYear: 2026,
          periodMonth: 8,
          amountPaid: 400,
        });
      });

      expect(payResult.success).toBe(true);
      expect(payResult.isDuplicate).toBe(false);
      expect(payResult.isOfflineSaved).toBe(true);
      expect(payResult.student.id).toBe('stu-valid-2026');

      const pending = await offlineDb.getPendingMutations();
      const financeMutations = pending.filter((m) => m.domain === 'finance');
      expect(financeMutations).toHaveLength(1);
      expect(financeMutations[0].payload.studentId).toBe('stu-valid-2026');
    });
  });
});
