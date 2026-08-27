import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('P0-001 User Isolation & Sync Filtering', () => {
  beforeEach(async () => {
    // Clear outbox before each test
    const mutations = await offlineDb.getPendingMutations(); // Gets all because no userId passed
    for (const m of mutations) {
      await offlineDb.removeMutation(m.id);
    }
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('Test 1 — User isolation: getPendingMutations(A) only returns A', async () => {
    // Add A mutation
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    // Add B mutation
    useAuthStore.setState({ user: { id: 'user-b' }, isAuthenticated: true });
    await syncEngine.enqueue('attendance', '/attendance', 'POST', { status: 'PRESENT' });

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(1);
    expect(aMutations[0].userId).toBe('user-a');
  });

  it('Test 2 — B isolation: getPendingMutations(B) only returns B', async () => {
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    useAuthStore.setState({ user: { id: 'user-b' }, isAuthenticated: true });
    await syncEngine.enqueue('attendance', '/attendance', 'POST', { status: 'PRESENT' });

    const bMutations = await offlineDb.getPendingMutations('user-b');
    expect(bMutations.length).toBe(1);
    expect(bMutations[0].userId).toBe('user-b');
  });

  it('Test 3 — Legacy excluded: getPendingMutations(A) excludes legacy', async () => {
    // Legacy record simulation
    const legacyRecord = {
      id: 'legacy-mut',
      domain: 'finance',
      endpoint: '/sync/payments',
      method: 'POST',
      payload: { amount: 50 },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    } as any;
    (offlineDb as any).memoryOutbox.set(legacyRecord.id, legacyRecord);

    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(1);
    expect(aMutations[0].id).not.toBe('legacy-mut');
    expect(aMutations[0].userId).toBe('user-a');
  });

  it('Test 4 — User B cannot undo User A mutation', async () => {
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    const mutId = await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    useAuthStore.setState({ user: { id: 'user-b' }, isAuthenticated: true });
    await syncEngine.undoMutation(mutId); // User B attempts to undo A's mutation

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(1); // Still exists
    expect(aMutations[0].id).toBe(mutId);
  });

  it('Test 5 — User B cannot discard User A mutation', async () => {
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    const mutId = await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    useAuthStore.setState({ user: { id: 'user-b' }, isAuthenticated: true });
    await syncEngine.discardAllLocalChanges(); // User B attempts to discard

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(1); // Still exists
    expect(aMutations[0].id).toBe(mutId);
  });

  it('Test 6 — No authenticated user aborts flushOutbox', async () => {
    useAuthStore.getState().clearSession(); // No user
    
    // Attempt flush
    const result = await syncEngine.flushOutbox();
    
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('Test 7 — Existing same-user Undo still works', async () => {
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    const mutId = await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });

    await syncEngine.undoMutation(mutId);

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(0); // Successfully undone
  });

  it('Test 8 — Existing same-user Discard still works', async () => {
    useAuthStore.setState({ user: { id: 'user-a' }, isAuthenticated: true });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 100 });
    await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 200 });

    await syncEngine.discardAllLocalChanges();

    const aMutations = await offlineDb.getPendingMutations('user-a');
    expect(aMutations.length).toBe(0); // Successfully discarded
  });
});
