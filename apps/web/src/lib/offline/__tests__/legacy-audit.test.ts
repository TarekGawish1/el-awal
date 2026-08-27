import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('P0-001 STEP 5 — Legacy Audit Diagnostics', () => {
  beforeEach(async () => {
    // Clear outbox entirely
    (offlineDb as any).memoryOutbox.clear();
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('Diagnostic 1 — Legacy records have no userId and are excluded from scoped queries', async () => {
    // 1. Manually insert a legacy record (simulating pre-V5 behavior)
    const legacyRecord = {
      id: 'legacy-123',
      domain: 'finance',
      endpoint: '/sync/payments',
      method: 'POST',
      payload: { amount: 500 },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };
    (offlineDb as any).memoryOutbox.set(legacyRecord.id, legacyRecord);

    // 2. Insert a modern record
    useAuthStore.setState({ user: { id: 'modern-user' }, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/sync/payments', 'POST', { amount: 100 });

    // 3. Raw read confirms both exist in DB
    const allRaw = Array.from((offlineDb as any).memoryOutbox.values());
    expect(allRaw.length).toBe(2);
    expect(allRaw.find(r => r.id === 'legacy-123').userId).toBeUndefined();

    // 4. Scoped read excludes legacy
    const scoped = await offlineDb.getPendingMutations('modern-user');
    expect(scoped.length).toBe(1);
    expect(scoped[0].userId).toBe('modern-user');
    
    // 5. Scoped UI read excludes legacy
    const activity = await syncEngine.getDetailedPendingActivity();
    expect(activity.length).toBe(1);
    expect(activity[0].raw.id).not.toBe('legacy-123');
  });

  it('Diagnostic 2 — Legacy records are immune to discardAllLocalChanges', async () => {
    // Insert legacy
    const legacyRecord = {
      id: 'legacy-456',
      domain: 'finance',
      endpoint: '/sync/payments',
      method: 'POST',
      payload: { amount: 500 },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };
    (offlineDb as any).memoryOutbox.set(legacyRecord.id, legacyRecord);

    useAuthStore.setState({ user: { id: 'modern-user' }, isAuthenticated: true });
    
    // Attempt discard
    const result = await syncEngine.discardAllLocalChanges();
    expect(result.discardedCount).toBe(0);

    // Verify legacy still exists untouched
    const allRaw = Array.from((offlineDb as any).memoryOutbox.values());
    expect(allRaw.length).toBe(1);
    expect(allRaw[0].id).toBe('legacy-456');
  });
});
