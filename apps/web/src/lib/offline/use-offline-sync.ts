'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncEngine } from './sync-engine';
import { offlineDb, SyncConflictRecord } from './db';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflicts: SyncConflictRecord[];
  lastSyncedAt: number | null;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  resolveConflict: (id: string, note?: string) => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const refreshState = useCallback(async () => {
    setIsOnline(syncEngine.isOnline());
    setIsSyncing(syncEngine.isSyncing());
    setLastSyncedAt(syncEngine.getLastSyncedAt());
    const count = await offlineDb.getPendingCount();
    setPendingCount(count);
    const unresolv = await offlineDb.getUnresolvedConflicts();
    setConflicts(unresolv);
  }, []);

  useEffect(() => {
    refreshState();

    const unsubscribe = syncEngine.subscribe((event) => {
      setIsOnline(syncEngine.isOnline());
      setIsSyncing(syncEngine.isSyncing());
      setLastSyncedAt(syncEngine.getLastSyncedAt());
      setPendingCount(event.pendingCount);

      if (event.type === 'SYNC_SUCCESS' || event.type === 'SYNC_ERROR') {
        offlineDb.getUnresolvedConflicts().then(setConflicts);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshState]);

  const syncNow = useCallback(async () => {
    return syncEngine.flushOutbox();
  }, []);

  const resolveConflict = useCallback(async (id: string, note?: string) => {
    await offlineDb.resolveConflict(id, note);
    const remaining = await offlineDb.getUnresolvedConflicts();
    setConflicts(remaining);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    conflicts,
    lastSyncedAt,
    syncNow,
    resolveConflict,
  };
}
