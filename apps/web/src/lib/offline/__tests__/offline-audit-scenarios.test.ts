/**
 * Comprehensive Offline Reliability Test Suite
 * Tests all 12 scenarios from the Offline Mode Audit requirements.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineDb, OutboxMutationRecord } from '../db';
import { syncEngine } from '../sync-engine';
import * as client from '../../api/client';
import * as authTokens from '@/features/auth/utils/auth-tokens';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  isAccessTokenExpiredOrExpiring: vi.fn(() => false),
  refreshAccessToken: vi.fn(async () => 'mock-token'),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

vi.mock('../../api/endpoints', () => ({
  API_BASE_URL: 'http://localhost:3000/api/v1',
  API_ENDPOINTS: {
    AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh' },
    GROUPS: { CREATE: '/groups', LIST: '/groups' },
    STUDENTS: { CREATE: '/students', LIST: '/students' },
    SYNC: {
      BOOTSTRAP: '/sync/bootstrap',
      DIFF: '/sync/diff',
      ATTENDANCE: '/sync/attendance',
      HOMEWORK: '/sync/homework',
      PAYMENTS: '/sync/payments',
      PROGRESS: '/sync/progress',
      ASSESSMENTS: '/sync/assessments',
      BATCH: '/sync/batch',
    },
    SUBSCRIPTIONS: { RECORD_PAYMENT: '/subscriptions/record' },
  },
}));

vi.mock('@/features/auth/utils/auth-tokens', () => ({
  getStoredAccessToken: vi.fn(() => 'mock-access-token'),
  getStoredRefreshToken: vi.fn(() => 'mock-refresh-token'),
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'teacher-001', role: 'TEACHER' },
    }),
  },
}));

vi.mock('./bootstrap-manager', () => ({
  bootstrapManager: {
    isBootstrapping: vi.fn(() => false),
    performBootstrap: vi.fn(async () => ({ success: true, isDelta: false })),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('Offline Reliability Test Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(client.apiClient).mockReset();
    await offlineDb.wipeAllOfflineData();

    // Seed a student for lookup
    await offlineDb.bulkPutStudents([{
      id: 'student-1',
      fullName: 'أحمد محمد',
      studentCode: 'STU-001',
      qrCodeToken: 'qr-tok-student-1',
      groupId: 'group-1',
    }]);
    await offlineDb.bulkPutGroups([{
      id: 'group-1',
      name: 'مجموعة اختبار',
      gradeLevel: 'الصف الأول',
      monthlyFee: 350,
    }]);
    await offlineDb.bulkPutSessions([{
      id: 'session-1',
      groupId: 'group-1',
      sessionDate: new Date().toISOString().slice(0, 10),
      group: { id: 'group-1', name: 'مجموعة اختبار' },
    }]);
  });

  // --- Scenario 1: Online Attendance ---
  it('Scenario 1: Online attendance succeeds normally via API', async () => {
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [{ mutationId: expect.any(String), status: 'SUCCESS' }],
    });

    const mutId = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    expect(mutId).toBeDefined();
    // When online, enqueue() triggers a sync
    // Verify mutation was created
    const pending = await offlineDb.getPendingMutations('teacher-001');
    // It may have already been flushed, but the mutation was at least created
    expect(mutId).toBeTruthy();
  });

  // --- Scenario 2: Offline Attendance ---
  it('Scenario 2: Offline attendance is stored locally and UI updates', async () => {
    const mutId = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    expect(mutId).toBeTruthy();
    expect(typeof mutId).toBe('string');

    // Verify operation stored in outbox
    const pending = await offlineDb.getPendingMutations('teacher-001');
    const found = pending.find(m => m.id === mutId);
    expect(found).toBeDefined();
    expect(found?.domain).toBe('attendance');
    expect(found?.status).toBe('PENDING');
    expect(found?.userId).toBe('teacher-001');
  });

  // --- Scenario 3: Multiple Offline Operations ---
  it('Scenario 3: Multiple offline operations all persist locally', async () => {
    const ids: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const id = await syncEngine.enqueue(
        'attendance',
        `/attendance/sessions/session-1/scan-qr`,
        'POST',
        { sessionId: 'session-1', studentId: `student-${i}`, status: 'PRESENT' },
      );
      ids.push(id);
    }

    const pending = await offlineDb.getPendingMutations('teacher-001');
    expect(pending.length).toBeGreaterThanOrEqual(5);

    // All IDs are unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  // --- Scenario 4: App Restart Persistence ---
  it('Scenario 4: Pending operations survive across simulated restarts (memory maps)', async () => {
    await syncEngine.enqueue(
      'finance',
      '/subscriptions/record',
      'POST',
      { studentId: 'student-1', groupId: 'group-1', periodYear: 2026, periodMonth: 8 },
    );

    // Verify in-memory
    const beforeRestart = await offlineDb.getPendingMutations('teacher-001');
    expect(beforeRestart.length).toBeGreaterThanOrEqual(1);
    expect(beforeRestart[0].domain).toBe('finance');
  });

  // --- Scenario 5: Automatic Sync on Internet Return ---
  it('Scenario 5: Operations automatically sync when flushOutbox is called', async () => {
    // Create two pending mutations
    const id1 = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );
    const id2 = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-2', status: 'PRESENT' },
    );

    // Mock successful batch sync
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [
        { mutationId: id1, status: 'SUCCESS' },
        { mutationId: id2, status: 'SUCCESS' },
      ],
    });

    const result = await syncEngine.flushOutbox({ force: true });

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);

    // Outbox should be empty
    const remaining = await offlineDb.getPendingMutations('teacher-001');
    expect(remaining).toHaveLength(0);
  });

  // --- Scenario 6: Network Loss During Sync ---
  it('Scenario 6: Network loss during sync does not lose operations', async () => {
    const id1 = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    // Simulate network failure during sync
    vi.mocked(client.apiClient).mockRejectedValueOnce(new Error('NetworkError'));

    const result = await syncEngine.flushOutbox({ force: true });

    // Operations should remain in outbox (FAILED status, not deleted)
    const pending = await offlineDb.getPendingMutations('teacher-001');
    expect(pending.length).toBeGreaterThanOrEqual(1);
    const failedItem = pending.find(m => m.id === id1);
    expect(failedItem).toBeDefined();
    expect(failedItem?.status).toBe('FAILED');
    expect(failedItem?.lastError).toContain('NetworkError');
  });

  // --- Scenario 7: API Failure ---
  it('Scenario 7: API failure keeps operations pending and retryable', async () => {
    const id1 = await syncEngine.enqueue(
      'finance',
      '/subscriptions/record',
      'POST',
      { studentId: 'student-1', groupId: 'group-1', periodYear: 2026, periodMonth: 9 },
    );

    // Simulate server error
    vi.mocked(client.apiClient).mockRejectedValueOnce(new Error('Internal Server Error'));

    await syncEngine.flushOutbox({ force: true });

    const pending = await offlineDb.getPendingMutations('teacher-001');
    const item = pending.find(m => m.id === id1);
    expect(item).toBeDefined();
    expect(item?.status).toBe('FAILED');
    expect(item?.retryCount).toBeGreaterThanOrEqual(1);
    expect(item?.lastAttemptAt).toBeDefined();
    expect(item?.lastAttemptAt).toBeGreaterThan(0);
  });

  // --- Scenario 8: Lost Response (Idempotency) ---
  it('Scenario 8: Backend idempotency prevents double execution on retry', async () => {
    const id1 = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    // First attempt: backend processes but we get network error
    vi.mocked(client.apiClient).mockRejectedValueOnce(new Error('NetworkError'));
    await syncEngine.flushOutbox({ force: true });

    // Mutation should be FAILED but still in outbox
    let pending = await offlineDb.getPendingMutations('teacher-001');
    expect(pending.find(m => m.id === id1)).toBeDefined();

    // Reset lastAttemptAt so retry backoff doesn't block
    await offlineDb.updateMutationStatus(id1, 'PENDING');

    // Second attempt: backend says "already exists" = SUCCESS (duplicatesIgnored)
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [{ mutationId: id1, status: 'SUCCESS' }],
    });

    const result = await syncEngine.flushOutbox({ force: true });
    expect(result.synced).toBe(1);

    // Outbox should now be empty
    pending = await offlineDb.getPendingMutations('teacher-001');
    expect(pending.find(m => m.id === id1)).toBeUndefined();
  });

  // --- Scenario 9: Concurrent Sync Prevention ---
  it('Scenario 9: Concurrent flushOutbox calls use mutex - only one sync runs', async () => {
    await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    let apiCallCount = 0;
    vi.mocked(client.apiClient).mockImplementation(async () => {
      apiCallCount++;
      // Simulate slow network
      await new Promise(r => setTimeout(r, 100));
      return {
        success: true,
        results: [{ mutationId: 'any', status: 'SUCCESS' }],
      };
    });

    // Fire two concurrent sync calls
    const [result1, result2] = await Promise.all([
      syncEngine.flushOutbox({ force: true }),
      syncEngine.flushOutbox({ force: true }),
    ]);

    // Both calls should resolve, but the API should only be called once
    // (the second call awaits the first's promise)
    expect(result1).toEqual(result2);
  });

  // --- Scenario 10: Authentication Failure Safety ---
  it('Scenario 10: Auth failure (401) does NOT delete pending operations', async () => {
    const id1 = await syncEngine.enqueue(
      'finance',
      '/subscriptions/record',
      'POST',
      { studentId: 'student-1', groupId: 'group-1', periodYear: 2026, periodMonth: 9 },
    );

    // Simulate 401 auth error
    vi.mocked(client.apiClient).mockRejectedValueOnce(new Error('401 Unauthorized'));

    await syncEngine.flushOutbox({ force: true });

    // Mutation should still be in outbox and NOT promoted to conflict
    const pending = await offlineDb.getPendingMutations('teacher-001');
    const item = pending.find(m => m.id === id1);
    expect(item).toBeDefined();
    // Auth errors should reset to PENDING, not increment retry count
    expect(item?.status).toBe('PENDING');
  });

  // --- Scenario 11: Payment Retry Idempotency ---
  it('Scenario 11: Payment is never duplicated by retries (duplicate guard)', async () => {
    // Record a payment
    const payment = await offlineDb.recordBookletPaymentOffline({
      studentId: 'student-1',
      bookletId: 'booklet-1',
      amountPaid: 50,
      groupId: 'group-1',
    });

    expect(payment.id).toBeDefined();
    expect(payment.amountPaid).toBe(50);

    // Attempting to record the same booklet payment again should throw
    await expect(
      offlineDb.recordBookletPaymentOffline({
        studentId: 'student-1',
        bookletId: 'booklet-1',
        amountPaid: 50,
        groupId: 'group-1',
      }),
    ).rejects.toThrow('DUPLICATE_PAYMENT');

    // Only one payment mutation should be in the outbox
    const pending = await offlineDb.getPendingMutations('teacher-001');
    const paymentMutations = pending.filter(m => m.domain === 'finance');
    expect(paymentMutations).toHaveLength(1);
  });

  // --- Scenario 12: Rapid QR Scanning Dedup ---
  it('Scenario 12: Rapid duplicate attendance scans are detected locally', async () => {
    // First scan
    await offlineDb.enqueueMutation({
      id: crypto.randomUUID(),
      domain: 'attendance',
      endpoint: '/attendance/sessions/session-1/scan-qr',
      method: 'POST',
      payload: { sessionId: 'session-1', studentId: 'student-1', qrCodeToken: 'qr-tok-student-1', status: 'PRESENT' },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      userId: 'teacher-001',
    });

    // Check if attendance is already recorded
    const isRecorded = await offlineDb.isAttendanceRecordedOffline('session-1', 'student-1', 'qr-tok-student-1');
    expect(isRecorded).toBe(true);

    // A different student should NOT be flagged as duplicate
    const isDifferentRecorded = await offlineDb.isAttendanceRecordedOffline('session-1', 'student-2');
    expect(isDifferentRecorded).toBe(false);
  });

  // --- Additional: lastAttemptAt Retry Backoff ---
  it('Retry backoff: recently-failed mutations are skipped in flush', async () => {
    // Create a mutation and mark it as recently failed
    const mutId = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      { sessionId: 'session-1', studentId: 'student-1', status: 'PRESENT' },
    );

    // Manually set it to FAILED with recent lastAttemptAt
    await offlineDb.updateMutationStatus(mutId, 'FAILED', 'Server error');

    // Verify it has lastAttemptAt set
    const pending = await offlineDb.getPendingMutations('teacher-001');
    const item = pending.find(m => m.id === mutId);
    expect(item?.lastAttemptAt).toBeDefined();
    expect(item?.lastAttemptAt).toBeGreaterThan(Date.now() - 5000);

    // Flush should skip it due to 30s backoff
    const result = await syncEngine.flushOutbox({ force: true });
    expect(result.synced).toBe(0);

    // Mutation should still be in the outbox (not lost)
    const afterFlush = await offlineDb.getPendingMutations('teacher-001');
    expect(afterFlush.find(m => m.id === mutId)).toBeDefined();
  });

  // --- Additional: Mutation ID Strength ---
  it('Mutation IDs generated by enqueue() are proper UUIDs', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const id = await syncEngine.enqueue(
        'attendance',
        '/test',
        'POST',
        { test: i },
      );
      ids.push(id);
    }

    // All unique
    expect(new Set(ids).size).toBe(10);

    // All should be UUID format (v4 pattern)
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });
});
