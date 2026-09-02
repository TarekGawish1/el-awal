import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineDb } from '../db';
import { OfflineSyncEngine } from '../sync-engine';
import { useAuthStore } from '@/features/auth/store/auth.store';

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: { id: 'test-user-123' } })),
  },
}));

describe('Offline Sync Recovery Tests', () => {
  let syncEngine: OfflineSyncEngine;

  beforeEach(async () => {
    await offlineDb.wipeAllOfflineData();
    // Re-initialize memory stores
    (offlineDb as any).memoryOutbox.clear();
    syncEngine = new OfflineSyncEngine();
  });

  afterEach(() => {
  });

  it('Test 1 — Normal sync flow', async () => {
    // Normal sync usually removes the mutation, but we mock the api endpoint in integration.
    // For unit level, we verify enqueueing works.
    await offlineDb.enqueueMutation({
      id: 'mut-normal',
      userId: 'test-user-123',
      domain: 'attendance',
      endpoint: '/test',
      method: 'POST',
      payload: {},
      status: 'PENDING',
      clientTimestamp: Date.now(),
      retryCount: 0,
    });
    const pending = await offlineDb.getPendingMutations('test-user-123');
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('mut-normal');
  });

  it('Test 2 & 6 — Crash before server commit / Browser restart (orphaned SYNCING recovery)', async () => {
    // 1. Create a stranded SYNCING mutation with an OLD lastAttemptAt
    await offlineDb.enqueueMutation({
      id: 'mut-stranded-1',
      userId: 'test-user-123',
      domain: 'attendance',
      endpoint: '/test',
      method: 'POST',
      payload: {},
      status: 'PENDING',
      clientTimestamp: Date.now() - 300000,
      retryCount: 0,
    });

    // 2. Mark as SYNCING but artificially backdate the lastAttemptAt
    await offlineDb.updateMutationStatus('mut-stranded-1', 'SYNCING');
    
    // Backdate in memory
    const mem = (offlineDb as any).memoryOutbox.get('mut-stranded-1');
    if (mem) mem.lastAttemptAt = Date.now() - 300000;

    // 4. Trigger recovery
    await offlineDb.recoverOrphanedSyncingMutations('test-user-123');

    // 5. Verify it was recovered
    const recovered = await offlineDb.getPendingMutations('test-user-123');
    expect(recovered.length).toBe(1);
    expect(recovered[0].status).toBe('FAILED');
  });

  it('Test 5 & 7 — Fresh SYNCING mutation (multi-tab safety)', async () => {
    // 1. Create a fresh SYNCING mutation
    await offlineDb.enqueueMutation({
      id: 'mut-fresh-1',
      userId: 'test-user-123',
      domain: 'attendance',
      endpoint: '/test',
      method: 'POST',
      payload: {},
      status: 'PENDING',
      clientTimestamp: Date.now(),
      retryCount: 0,
    });

    await offlineDb.updateMutationStatus('mut-fresh-1', 'SYNCING');

    // 3. Trigger recovery immediately (should NOT recover because it's fresh)
    await offlineDb.recoverOrphanedSyncingMutations('test-user-123');

    // 4. Verify it was NOT recovered
    const pending = await offlineDb.getPendingMutations('test-user-123');
    expect(pending.length).toBe(0);
    
    // Direct check of memory/db
    const all = Array.from((offlineDb as any).memoryOutbox.values());
    expect(all[0].status).toBe('SYNCING');
  });
});
