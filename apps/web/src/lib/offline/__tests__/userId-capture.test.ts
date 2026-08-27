import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import { useAuthStore } from '@/features/auth/store/auth.store';

describe('P0-001 User ID Capture', () => {
  beforeEach(async () => {
    // Clear outbox before each test
    const mutations = await offlineDb.getPendingMutations();
    for (const m of mutations) {
      await offlineDb.removeMutation(m.id);
    }
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('Test 1 — Authenticated enqueue captures user ID', async () => {
    useAuthStore.setState({
      user: { id: 'user-a-123', fullName: 'User A', role: 'TEACHER' },
      isAuthenticated: true,
      isInitialized: true,
    });

    const mutationId = await syncEngine.enqueue(
      'finance',
      '/sync/payments',
      'POST',
      { amount: 100 }
    );

    const pending = await offlineDb.getPendingMutations();
    const record = pending.find((m) => m.id === mutationId);
    
    expect(record).toBeDefined();
    expect(record?.userId).toBe('user-a-123');
  });

  it('Test 2 — Different user captures different ID', async () => {
    useAuthStore.setState({
      user: { id: 'user-b-456', fullName: 'User B', role: 'TEACHER' },
      isAuthenticated: true,
      isInitialized: true,
    });

    const mutationId = await syncEngine.enqueue(
      'attendance',
      '/sync/attendance',
      'POST',
      { status: 'PRESENT' }
    );

    const pending = await offlineDb.getPendingMutations();
    const record = pending.find((m) => m.id === mutationId);
    
    expect(record).toBeDefined();
    expect(record?.userId).toBe('user-b-456');
  });

  it('Test 3 — Existing legacy record remains untouched', async () => {
    // Insert a legacy record bypassing enqueueMutation
    const legacyRecord = {
      id: 'legacy-mut-1',
      domain: 'finance',
      endpoint: '/sync/payments',
      method: 'POST',
      payload: { amount: 50 },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    } as any;
    
    // Use raw IndexedDB access or memory access to simulate legacy insert
    // Use memory map to simulate legacy insert
    (offlineDb as any).memoryOutbox.set(legacyRecord.id, legacyRecord);

    // Enqueue a new mutation to trigger any internal flows
    useAuthStore.setState({
      user: { id: 'user-c-789', fullName: 'User C', role: 'TEACHER' },
      isAuthenticated: true,
    });
    
    await syncEngine.enqueue(
      'groups',
      '/groups',
      'POST',
      { name: 'Group C' }
    );

    const pending = await offlineDb.getPendingMutations();
    const legacy = pending.find((m) => m.id === 'legacy-mut-1');
    const newMut = pending.find((m) => m.id !== 'legacy-mut-1');
    
    expect(legacy).toBeDefined();
    expect(legacy?.userId).toBeUndefined(); // Should NOT have been assigned a userId
    
    expect(newMut).toBeDefined();
    expect(newMut?.userId).toBe('user-c-789');
  });

  it('Test 4 — All mutation paths', async () => {
    useAuthStore.setState({
      user: { id: 'user-d-000', fullName: 'User D', role: 'TEACHER' },
      isAuthenticated: true,
    });

    // Path 1: syncEngine.enqueue
    await syncEngine.enqueue('students', '/students', 'POST', { name: 'Student 1' });

    // Path 2: offlineDb.outbox_mutations.add
    await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: { score: 10 }
    });
    const pending = await offlineDb.getPendingMutations();
    expect(pending.length).toBeGreaterThanOrEqual(2);
    
    // Verify ALL have the correct userId
    for (const record of pending) {
      expect(record.userId).toBe('user-d-000');
    }
  });
  
  it('Authentication requirement — Rejects if unauthenticated', async () => {
    useAuthStore.getState().clearSession(); // No user
    
    await expect(
      syncEngine.enqueue('finance', '/sync/payments', 'POST', { amount: 100 })
    ).rejects.toThrow('Authentication required to save offline changes.');
  });
});
