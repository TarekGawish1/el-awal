import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncQueue } from '../useSyncQueue';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import * as client from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('useSyncQueue - Realtime Cache Invalidation & Query Refetching', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    await offlineDb.wipeAllOfflineData();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('provides pending mutations using outbox_mutations.where("status").equals("PENDING")', async () => {
    await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        assessmentId: 'ass-1',
        studentId: 'stu-1',
        sessionId: 'sess-1',
      },
    });

    const { result } = renderHook(() => useSyncQueue({ sessionId: 'sess-1' }), { wrapper });

    let pending: any[] = [];
    await act(async () => {
      pending = await result.current.getPendingMutations();
    });

    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('RECORD_HOMEWORK_ONSITE');
  });

  it('triggers TanStack query cache invalidation and query refetch on sync completion', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

    await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        assessmentId: 'ass-10',
        studentId: 'stu-10',
        sessionId: 'session-xyz',
        status: 'CHECKED_ONSITE',
      },
    });

    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [{ mutationId: expect.any(String), status: 'SUCCESS' }],
    });

    const { result } = renderHook(() => useSyncQueue({ sessionId: 'session-xyz' }), { wrapper });

    await act(async () => {
      await result.current.flushQueue();
    });

    // Verify TanStack query keys were invalidated:
    // ['session-details', sessionId]
    // ['homework-records', sessionId]
    // ['attendance-records', sessionId]
    // ['student-group-sessions']
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['student-group-sessions'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['session-details', 'session-xyz'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['homework-records', 'session-xyz'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['attendance-records', 'session-xyz'] }),
    );

    // Verify immediate refetching triggered
    expect(refetchSpy).toHaveBeenCalledWith({ type: 'active' });
  });
});
