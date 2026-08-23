import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useScanPaymentQr, useRecordPayment } from '../hooks/useFinance';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';

describe('Offline Payment Amount Extraction & Duplicate Prevention', () => {
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
    await offlineDb.wipeAllOfflineData();

    // Set offline mode
    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    // Seed group with specific monthly fee (250 EGP)
    await offlineDb.bulkPutGroups([
      {
        id: 'group-bio-2026',
        name: 'مجموعة الأحياء المتميزة',
        gradeLevel: 'الصف الأول الثانوي',
        monthlyFee: 250,
      } as any,
    ]);

    // Seed student belonging to that group
    await offlineDb.bulkPutStudents([
      {
        id: 'stu-bio-001',
        fullName: 'زياد طارق الشريف',
        studentCode: 'STU-2026-BIO1',
        qrCodeToken: 'qr_tok_ziad_bio_001',
        groupId: 'group-bio-2026',
        gradeLevel: 'الصف الأول الثانوي',
        academicStatus: 'ACTIVE',
        user: { fullName: 'زياد طارق الشريف', phone: '01012345678' },
      } as any,
    ]);

    // Seed a booklet (price: 75 EGP)
    await offlineDb.bulkPutBooklets([
      {
        id: 'booklet-bio-ch1',
        title: 'مذكرة الباب الأول - الأحياء',
        price: 75,
        gradeLevel: 'الصف الأول الثانوي',
        groupId: 'group-bio-2026',
        isActive: true,
      } as any,
    ]);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('extracts positive group monthly fee (250 EGP) when scanning tuition QR offline without explicit amount override', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

    let scanRes: any;
    await act(async () => {
      scanRes = await result.current.mutateAsync({
        qrCodeToken: 'qr_tok_ziad_bio_001',
        paymentType: 'TUITION',
        periodYear: 2026,
        periodMonth: 8,
      });
    });

    // 1. Verify response has correct positive fee (250 EGP), not 0
    expect(scanRes.success).toBe(true);
    expect(scanRes.isDuplicate).toBe(false);
    expect(scanRes.isOfflineSaved).toBe(true);
    expect(scanRes.payment.amountPaid).toBe(250);
    expect(scanRes.payment.amountExpected).toBe(250);

    // 2. Verify mutation payload stored in outbox has amount: 250
    const pending = await offlineDb.getPendingMutations();
    const financeMutations = pending.filter((m) => m.domain === 'finance');
    expect(financeMutations).toHaveLength(1);
    expect(financeMutations[0].payload.amount).toBe(250);
    expect(financeMutations[0].payload.amountPaid).toBe(250);

    // 3. Verify sync confirmation modal activity list displays "250 ج.م", not "0 ج.م"
    const activity = await syncEngine.getDetailedPendingActivity();
    const tuitionActivity = activity.find((a) => a.kind === 'TUITION_PAYMENT');
    expect(tuitionActivity).toBeDefined();
    expect(tuitionActivity?.amount).toBe(250);
    expect(tuitionActivity?.subtitle).toContain('250 ج.م');
  });

  it('blocks immediate duplicate scans for the same student and month offline, preventing zero/duplicate mutations', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

    // First scan
    await act(async () => {
      await result.current.mutateAsync({
        qrCodeToken: 'qr_tok_ziad_bio_001',
        paymentType: 'TUITION',
        periodYear: 2026,
        periodMonth: 8,
      });
    });

    // Second scan (immediate rescan of same student for month 8/2026)
    let duplicateRes: any;
    await act(async () => {
      duplicateRes = await result.current.mutateAsync({
        qrCodeToken: 'qr_tok_ziad_bio_001',
        paymentType: 'TUITION',
        periodYear: 2026,
        periodMonth: 8,
      });
    });

    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.isDuplicate).toBe(true);
    expect(duplicateRes.message).toContain('مسبقاً');

    // Verify outbox STILL has only 1 mutation (no duplicate queued)
    const pending = await offlineDb.getPendingMutations();
    expect(pending.filter((m) => m.domain === 'finance')).toHaveLength(1);
  });

  it('extracts booklet price (75 EGP) when scanning booklet QR offline and detects duplicate booklet payments', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScanPaymentQr(), { wrapper });

    let scanRes: any;
    await act(async () => {
      scanRes = await result.current.mutateAsync({
        qrCodeToken: 'qr_tok_ziad_bio_001',
        paymentType: 'BOOKLET',
        bookletId: 'booklet-bio-ch1',
        groupId: 'group-bio-2026',
      });
    });

    expect(scanRes.success).toBe(true);
    expect(scanRes.isDuplicate).toBe(false);
    expect(scanRes.payment.amountPaid).toBe(75);

    const pending = await offlineDb.getPendingMutations();
    const bookletMutation = pending.find((m) => m.payload.paymentType === 'BOOKLET');
    expect(bookletMutation).toBeDefined();
    expect(bookletMutation?.payload.amount).toBe(75);

    // Rescan booklet for same student
    let duplicateRes: any;
    await act(async () => {
      duplicateRes = await result.current.mutateAsync({
        qrCodeToken: 'qr_tok_ziad_bio_001',
        paymentType: 'BOOKLET',
        bookletId: 'booklet-bio-ch1',
        groupId: 'group-bio-2026',
      });
    });

    expect(duplicateRes.isDuplicate).toBe(true);
    expect(duplicateRes.message).toContain('مسبقاً');
  });

  it('correctly sets amount when using useRecordPayment manually in offline mode', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRecordPayment(), { wrapper });

    let recordRes: any;
    await act(async () => {
      recordRes = await result.current.mutateAsync({
        studentId: 'stu-bio-001',
        groupId: 'group-bio-2026',
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 0, // Should be auto-resolved to group monthly fee (250)
        paymentMethod: 'CASH',
      });
    });

    expect(recordRes.isOfflineSaved).toBe(true);
    expect(recordRes.payment.amountPaid).toBe(250);

    const pending = await offlineDb.getPendingMutations();
    const month9Mutation = pending.find((m) => m.payload.periodMonth === 9);
    expect(month9Mutation).toBeDefined();
    expect(month9Mutation?.payload.amount).toBe(250);
  });
});
