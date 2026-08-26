'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncEngine } from '@/lib/offline/sync-engine';
import { offlineDb, OutboxMutationRecord } from '@/lib/offline/db';

export interface UseSyncQueueOptions {
  sessionId?: string;
  autoRefetch?: boolean;
}

export function useSyncQueue(options?: UseSyncQueueOptions) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(syncEngine.isSyncing());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(syncEngine.getLastSyncedAt());

  // Attach queryClient to syncEngine so engine-level events can also invalidate
  useEffect(() => {
    if (queryClient) {
      syncEngine.setQueryClient(queryClient);
    }
  }, [queryClient]);

  const refreshQueueState = useCallback(async () => {
    setIsOnline(syncEngine.isOnline());
    setIsSyncing(syncEngine.isSyncing());
    setLastSyncedAt(syncEngine.getLastSyncedAt());
    const count = await offlineDb.getPendingCount();
    setPendingCount(count);
  }, []);

  const invalidateAndRefetch = useCallback(
    async (targetSessionId?: string) => {
      const sid = targetSessionId || options?.sessionId;
      const invalidations: Promise<any>[] = [
        queryClient.invalidateQueries({ queryKey: ['student-group-sessions'] }),
      ];

      if (sid) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['session-details', sid] }),
          queryClient.invalidateQueries({ queryKey: ['homework-records', sid] }),
          queryClient.invalidateQueries({ queryKey: ['attendance-records', sid] }),
        );
      } else {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['session-details'] }),
          queryClient.invalidateQueries({ queryKey: ['homework-records'] }),
          queryClient.invalidateQueries({ queryKey: ['attendance-records'] }),
        );
      }

      await Promise.all(invalidations);
      if (typeof queryClient.refetchQueries === 'function') {
        await queryClient.refetchQueries({ type: 'active' });
      }
    },
    [queryClient, options?.sessionId],
  );

  useEffect(() => {
    refreshQueueState();

    const unsubscribe = syncEngine.subscribe(async (event) => {
      setIsOnline(syncEngine.isOnline());
      setIsSyncing(syncEngine.isSyncing());
      setLastSyncedAt(syncEngine.getLastSyncedAt());
      setPendingCount(event.pendingCount);

      if (event.type === 'SYNC_SUCCESS') {
        await invalidateAndRefetch();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshQueueState, invalidateAndRefetch]);

  const flushQueue = useCallback(
    async (customOptions?: { mutationIds?: string[]; force?: boolean }) => {
      const result = await syncEngine.flushOutbox(customOptions);
      if (result.synced > 0) {
        await invalidateAndRefetch();
      }
      return result;
    },
    [invalidateAndRefetch],
  );

  const getPendingMutations = useCallback(async (): Promise<OutboxMutationRecord[]> => {
    return offlineDb.outbox_mutations.where('status').equals('PENDING').toArray();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    flushQueue,
    getPendingMutations,
    invalidateAndRefetch,
  };
}
