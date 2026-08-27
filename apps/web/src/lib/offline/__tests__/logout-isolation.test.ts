import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('P0-001 STEP 6B — Logout Isolation Implementation', () => {
  beforeEach(async () => {
    (offlineDb as any).memoryOutbox.clear();
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('Test 1 — No pending mutations -> 0 count', async () => {
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    const count = await offlineDb.getUserPendingCount('user-a');
    expect(count).toBe(0);
  });

  it('Test 2 — Pending mutations trigger warning count', async () => {
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 200 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 300 });

    const count = await offlineDb.getUserPendingCount('user-a');
    expect(count).toBe(3);
  });

  it('Test 4 — Confirm logout deletes user A mutations', async () => {
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 200 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 300 });

    const deletedCount = await offlineDb.clearUserPendingMutations('user-a');
    expect(deletedCount).toBe(3);

    const remaining = await offlineDb.getUserPendingCount('user-a');
    expect(remaining).toBe(0);
  });

  it('Test 5 & 6 & 10 — Other user and legacy mutations preserved', async () => {
    // 1. Insert User A mutations
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 200 });

    // 2. Insert User B mutations
    useAuthStore.setState({ user: { id: 'user-b' } as any, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 500 });

    // 3. Insert Legacy Mutation manually
    const legacyRecord = {
      id: 'legacy-123',
      domain: 'finance',
      endpoint: '/sync/payments',
      method: 'POST',
      payload: { amount: 1000 },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };
    (offlineDb as any).memoryOutbox.set(legacyRecord.id, legacyRecord);

    // Initial counts
    expect(await offlineDb.getUserPendingCount('user-a')).toBe(2);
    expect(await offlineDb.getUserPendingCount('user-b')).toBe(1);

    // Delete A
    const deletedCount = await offlineDb.clearUserPendingMutations('user-a');
    expect(deletedCount).toBe(2);

    // Check remaining
    expect(await offlineDb.getUserPendingCount('user-a')).toBe(0);
    expect(await offlineDb.getUserPendingCount('user-b')).toBe(1); // User B preserved
    
    // Check legacy preserved
    const allRaw = Array.from((offlineDb as any).memoryOutbox.values());
    const legacyFound = allRaw.find((m: any) => m.id === 'legacy-123') as any;
    expect(legacyFound).toBeDefined();
    expect(legacyFound.userId).toBeUndefined(); // Legacy untouched
  });
});
