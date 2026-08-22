import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionReport, useScanQrAttendance, useManualAttendance } from '../hooks/use-attendance';
import { offlineDb } from '@/lib/offline/db';

describe('Offline Session Report & "ملخص الحصة" Metrics Integration', () => {
  let queryClient: QueryClient;
  let originalNavigatorOnLine: boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, networkMode: 'always' },
        mutations: { retry: false, networkMode: 'always' },
      },
    });

    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    await offlineDb.wipeAllOfflineData();

    // Seed group with 10 students
    await offlineDb.bulkPutGroups([
      {
        id: 'group-1',
        name: 'مجموعة الصف الأول الثانوي (أ)',
        gradeLevel: 'الصف الأول الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
      },
    ]);

    const students = Array.from({ length: 10 }, (_, i) => ({
      id: `stu-${i + 1}`,
      fullName: `طالب ${i + 1}`,
      studentCode: `STU-${100 + i}`,
      qrCodeToken: `QR-STU-${100 + i}`,
      groupId: 'group-1',
      academicStatus: 'ACTIVE',
    }));

    await offlineDb.bulkPutStudents(students);

    await offlineDb.bulkPutSessions([
      {
        id: 'session-101',
        groupId: 'group-1',
        sessionDate: '2026-08-22T16:00:00.000Z',
        topic: 'كاد وأخواتها وأفعال المقاربة والرجاء والشروع',
      },
    ]);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders offline session report with full roster and calculates live metrics when scanning QR codes', async () => {
    // 1. Initial Load: Fetch session report in offline mode
    const { result } = renderHook(() => useSessionReport('session-101'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data.groupName).toBe('مجموعة الصف الأول الثانوي (أ)');
    expect(result.current.data.metrics.totalEnrolled).toBe(10);
    expect(result.current.data.metrics.presentCount).toBe(0);
    expect(result.current.data.metrics.absentCount).toBe(10);
    expect(result.current.data.metrics.attendanceRatePercentage).toBe(0);
    expect(result.current.data.records.length).toBe(10);

    // 2. Scan QR for student 1 in offline mode
    const { result: scanMutation } = renderHook(() => useScanQrAttendance(), { wrapper });

    await act(async () => {
      await scanMutation.current.mutateAsync({
        sessionId: 'session-101',
        qrCodeToken: 'QR-STU-100',
      });
    });

    // 3. Verify session report metrics dynamically updated
    await waitFor(() => {
      expect(result.current.data?.metrics?.presentCount).toBe(1);
    });

    expect(result.current.data.metrics.absentCount).toBe(9);
    expect(result.current.data.metrics.attendanceRatePercentage).toBe(10);

    const student1Record = result.current.data.records.find((r: any) => r.studentId === 'stu-1');
    expect(student1Record?.status).toBe('PRESENT');
  });

  it('accurately computes offline metrics for manual batch attendance', async () => {
    const { result: manualMutation } = renderHook(() => useManualAttendance(), { wrapper });

    await act(async () => {
      await manualMutation.current.mutateAsync({
        sessionId: 'session-101',
        payload: {
          records: [
            { studentId: 'stu-1', status: 'PRESENT' },
            { studentId: 'stu-2', status: 'PRESENT' },
            { studentId: 'stu-3', status: 'PRESENT' },
            { studentId: 'stu-4', status: 'PRESENT' },
            { studentId: 'stu-5', status: 'PRESENT' },
            { studentId: 'stu-6', status: 'PRESENT' },
            { studentId: 'stu-7', status: 'PRESENT' },
            { studentId: 'stu-8', status: 'PRESENT' },
            { studentId: 'stu-9', status: 'EXCUSED' },
            { studentId: 'stu-10', status: 'ABSENT' },
          ],
        },
      });
    });

    const { result: reportResult } = renderHook(() => useSessionReport('session-101'), { wrapper });
    await waitFor(() => {
      expect(reportResult.current.isSuccess).toBe(true);
      expect(reportResult.current.data?.metrics?.presentCount).toBe(8);
    });

    expect(reportResult.current.data.metrics.totalEnrolled).toBe(10);
    expect(reportResult.current.data.metrics.excusedCount).toBe(1);
    expect(reportResult.current.data.metrics.absentCount).toBe(1);
    expect(reportResult.current.data.metrics.attendanceRatePercentage).toBe(80);
  });
});
