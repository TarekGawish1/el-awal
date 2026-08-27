import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useRecordPayment, useDeletePayment } from '../hooks/useFinance';
import { offlineDb } from '@/lib/offline/db';
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('Offline Payment Deletion (Tuition & Booklet)', () => {
  let queryClient: QueryClient;
  let originalNavigatorOnLine: boolean;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'teacher-del-1',
        fullName: 'المعلم التجريبي',
        role: 'TEACHER' as any,
      } as any,
      isAuthenticated: true,
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await offlineDb.wipeAllOfflineData();

    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    await offlineDb.putStudent({
      id: 'student-del-1',
      fullName: 'ياسمين علي',
      studentCode: 'STU-DEL-1',
      qrCodeToken: 'qr-student-del-1',
      gradeLevel: 'الصف الأول الثانوي',
      academicStatus: 'ACTIVE',
      user: { fullName: 'ياسمين علي', isActive: true },
      paymentRecords: [],
    } as any);

    await offlineDb.putBooklet({
      id: 'booklet-del-1',
      title: 'مذكرة الأحياء الشاملة',
      price: 70,
      gradeLevel: 'الصف الأول الثانوي',
      stockCount: 20,
      salesCount: 5,
      totalRevenue: 350,
      isActive: true,
    } as any);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('records a booklet payment offline, then deleting it purges the outbox mutation and restores stock/revenue (Case A)', async () => {
    const { result: recordResult } = renderHook(() => useRecordPayment(), { wrapper });

    let recordOutcome: any;
    await act(async () => {
      recordOutcome = await recordResult.current.mutateAsync({
        studentId: 'student-del-1',
        bookletId: 'booklet-del-1',
        paymentType: 'BOOKLET',
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 70,
      });
    });

    expect(recordOutcome.success).toBe(true);
    expect(recordOutcome.isOfflineSaved).toBe(true);
    const createdPaymentId = recordOutcome.payment.id;

    // Sanity check: mutation was enqueued and stock was decremented
    const pendingAfterCreate = await offlineDb.getPendingMutations();
    expect(pendingAfterCreate.filter((m) => m.domain === 'finance')).toHaveLength(1);

    const bookletAfterCreate = await offlineDb.getBookletByIdOffline('booklet-del-1');
    expect(bookletAfterCreate?.stockCount).toBe(19);
    expect(bookletAfterCreate?.salesCount).toBe(6);
    expect(bookletAfterCreate?.totalRevenue).toBe(420);

    const studentAfterCreate = await offlineDb.getStudentByIdOffline('student-del-1');
    expect(studentAfterCreate?.paymentRecords?.length).toBe(0); // recordBookletPaymentOffline does not touch paymentRecords directly

    const paymentsBeforeDelete = await offlineDb.getPaymentsOffline({ studentId: 'student-del-1' });
    expect(paymentsBeforeDelete).toHaveLength(1);

    // Now delete the still-unsynced booklet payment while offline
    const { result: deleteResult } = renderHook(() => useDeletePayment(), { wrapper });

    let deleteOutcome: any;
    await act(async () => {
      deleteOutcome = await deleteResult.current.mutateAsync(createdPaymentId);
    });

    expect(deleteOutcome.success).toBe(true);
    expect(deleteOutcome.mode).toBe('LOCAL_DISCARD');

    // Mutation must be purged from outbox_mutations
    const pendingAfterDelete = await offlineDb.getPendingMutations();
    expect(pendingAfterDelete.filter((m) => m.domain === 'finance')).toHaveLength(0);

    // Payment record must be gone from local IndexedDB
    const paymentsAfterDelete = await offlineDb.getPaymentsOffline({ studentId: 'student-del-1' });
    expect(paymentsAfterDelete).toHaveLength(0);

    // Booklet stock/revenue must be restored (student "balance" reverted)
    const bookletAfterDelete = await offlineDb.getBookletByIdOffline('booklet-del-1');
    expect(bookletAfterDelete?.stockCount).toBe(20);
    expect(bookletAfterDelete?.salesCount).toBe(5);
    expect(bookletAfterDelete?.totalRevenue).toBe(350);
  });

  it('reverts a synced tuition payment to unpaid and queues a DELETE_PAYMENT mutation when deleted offline (Case B)', async () => {
    // Seed a payment as if it was already synced from the server (no pending outbox mutation for it)
    const serverPayment = {
      id: 'srv-payment-del-1',
      studentId: 'student-del-1',
      groupId: 'group-del-1',
      periodYear: 2026,
      periodMonth: 10,
      amountPaid: 300,
      amountExpected: 300,
      paymentType: 'TUITION',
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
    };

    await offlineDb.bulkPutPayments([serverPayment as any]);
    await offlineDb.markStudentPaidOffline('student-del-1', serverPayment as any);

    const studentBefore = await offlineDb.getStudentByIdOffline('student-del-1');
    expect(studentBefore?.paymentRecords?.length).toBe(1);

    const { result: deleteResult } = renderHook(() => useDeletePayment(), { wrapper });

    let deleteOutcome: any;
    await act(async () => {
      deleteOutcome = await deleteResult.current.mutateAsync('srv-payment-del-1');
    });

    expect(deleteOutcome.success).toBe(true);
    expect(deleteOutcome.mode).toBe('QUEUED_DELETE');

    // Payment must be optimistically removed locally (student reverted to unpaid)
    const paymentsAfter = await offlineDb.getPaymentsOffline({ studentId: 'student-del-1' });
    expect(paymentsAfter).toHaveLength(0);

    const studentAfter = await offlineDb.getStudentByIdOffline('student-del-1');
    expect(studentAfter?.paymentRecords?.length).toBe(0);

    // A DELETE_PAYMENT mutation must be queued in the outbox for later sync
    const pending = await offlineDb.getPendingMutations();
    const deleteMutations = pending.filter((m) => m.domain === 'finance' && m.payload?.type === 'DELETE_PAYMENT');
    expect(deleteMutations).toHaveLength(1);
    expect(deleteMutations[0].payload.paymentId).toBe('srv-payment-del-1');
  });
});
