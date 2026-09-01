import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { offlineDb } from '@/lib/offline/db';

vi.mock('@/lib/offline/db', () => {
  return {
    offlineDb: {
      findStudentByQrToken: vi.fn(),
      isAttendanceRecordedOffline: vi.fn().mockResolvedValue(false),
      recordAttendanceOffline: vi.fn().mockResolvedValue({}),
      getStore: vi.fn(),
      getAllCachedRosters: vi.fn(),
      getRoster: vi.fn(),
      getStudentByIdOffline: vi.fn(),
      getStudentsOffline: vi.fn(),
    },
  };
});

vi.mock('@/lib/api/client', () => ({}));
vi.mock('@/lib/api/endpoints', () => ({}));
vi.mock('@/lib/offline/sync-engine', () => ({
  syncEngine: {
    syncNow: vi.fn(),
  }
}));
vi.mock('@/features/attendance/api/attendance.api', () => ({
  attendanceApi: {
    recordAttendance: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Offline Enrollment & Roster Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test A & F - Fresh student record beats stale roster & Stale roster cannot bypass validation', async () => {
    // The db.ts fix causes findStudentByQrToken to return the authoritative student.groupId (Group B).
    // The stale roster cache issue is bypassed because isStudentEnrolledInSession in use-attendance
    // now uses isDirectGroupMatch based on this authoritative data.

    (offlineDb.findStudentByQrToken as any).mockResolvedValue({
      student: { id: 'stu-1', groupId: 'group-b', studentCode: 'S1' },
      groupId: 'group-b',
      groupName: 'Group B',
    });

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    const scanResult = await result.current.mutateAsync({
      sessionId: 'session-1',
      sessionGroupId: 'group-a', // We are scanning for Group A
      studentGroupId: 'group-b',
      studentGroupName: 'Group B',
      qrCodeToken: 'S1',
      allowCrossGroup: false, // Disallow cross group
    });

    // It MUST be rejected with a cross-group prompt
    expect(scanResult.isCrossGroupPrompt).toBe(true);
    expect(scanResult.message).toContain('طالب من خارج المجموعة');
    expect(offlineDb.recordAttendanceOffline).not.toHaveBeenCalled();
  });

  it('Test C - Valid current enrollment', async () => {
    (offlineDb.findStudentByQrToken as any).mockResolvedValue({
      student: { id: 'stu-1', groupId: 'group-a', studentCode: 'S1' },
      groupId: 'group-a',
      groupName: 'Group A',
    });

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    const scanResult = await result.current.mutateAsync({
      sessionId: 'session-1',
      sessionGroupId: 'group-a',
      studentGroupId: 'group-a',
      studentGroupName: 'Group A',
      qrCodeToken: 'S1',
      allowCrossGroup: false,
    });

    expect(scanResult.isCrossGroupPrompt).toBe(false);
    expect(offlineDb.recordAttendanceOffline).toHaveBeenCalled();
  });

  it('Test D - Legitimate cross-group attendance', async () => {
    (offlineDb.findStudentByQrToken as any).mockResolvedValue({
      student: { id: 'stu-1', groupId: 'group-b', studentCode: 'S1' },
      groupId: 'group-b',
      groupName: 'Group B',
    });

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    const scanResult = await result.current.mutateAsync({
      sessionId: 'session-1',
      sessionGroupId: 'group-a', // Scanning for Group A
      studentGroupId: 'group-b',
      studentGroupName: 'Group B',
      qrCodeToken: 'S1',
      allowCrossGroup: true, // EXPLICITLY ALLOWED
    });

    // Should NOT show cross group prompt, but should record successfully as a guest
    expect(scanResult.isCrossGroupPrompt).toBe(false);
    expect(offlineDb.recordAttendanceOffline).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCrossGroup: true,
        isGuest: true,
      })
    );
  });

  it('Test E - Cross-group attendance disabled', async () => {
    (offlineDb.findStudentByQrToken as any).mockResolvedValue({
      student: { id: 'stu-1', groupId: 'group-b', studentCode: 'S1' },
      groupId: 'group-b',
      groupName: 'Group B',
    });

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    const scanResult = await result.current.mutateAsync({
      sessionId: 'session-1',
      sessionGroupId: 'group-a',
      studentGroupId: 'group-b',
      studentGroupName: 'Group B',
      qrCodeToken: 'S1',
      allowCrossGroup: false, // NOT ALLOWED
    });

    expect(scanResult.isCrossGroupPrompt).toBe(true);
    expect(offlineDb.recordAttendanceOffline).not.toHaveBeenCalled();
  });
});
