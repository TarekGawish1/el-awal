import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/offline/db', () => ({
  offlineDb: {
    findStudentByQrToken: vi.fn(),
    isAttendanceRecordedOffline: vi.fn(),
    getSessionsOffline: vi.fn().mockResolvedValue([]),
    getGroupByIdOffline: vi.fn(),
  },
}));

vi.mock('@/lib/offline/sync-engine', () => ({
  syncEngine: {
    enqueue: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Offline QR Scan - Uncached Student', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('should preserve uncached student qrCodeToken instead of throwing STUDENT_NOT_FOUND', async () => {
    // Local match returns null
    (offlineDb.findStudentByQrToken as any).mockResolvedValue(null);
    (offlineDb.isAttendanceRecordedOffline as any).mockResolvedValue(false);

    const { result } = renderHook(() => useScanQrAttendance(), { wrapper });

    let scanResult: any;
    await act(async () => {
      scanResult = await result.current.mutateAsync({
        sessionId: 'session-123',
        qrCodeToken: 'qr_tok_unknown',
      });
    });

    expect(scanResult.isUnknown).toBe(true);
    expect(scanResult.message).toContain('تم حفظ الرمز محلياً');
    
    // Verify syncEngine.enqueue was called with the raw token
    expect(syncEngine.enqueue).toHaveBeenCalledWith(
      'attendance',
      expect.stringContaining('session-123'),
      'POST',
      expect.objectContaining({
        qrCodeToken: 'qr_tok_unknown',
        sessionId: 'session-123',
        status: 'PRESENT',
      })
    );
  });
});
