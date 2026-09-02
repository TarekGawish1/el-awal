import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({ user: { id: 'teacher-1' }, isAuthenticated: true }),
  },
}));

describe('Offline Storage & Sync Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(client.apiClient).mockReset();
    await offlineDb.wipeAllOfflineData();
  });

  it('enqueues mutations into IndexedDB outbox queue', async () => {
    const mutationId = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/session-1/scan-qr',
      'POST',
      {
        sessionId: 'session-1',
        qrCodeToken: 'qr-student-1',
      },
    );

    expect(mutationId).toBeDefined();
    expect(typeof mutationId).toBe('string');
  });

  it('flushes outbox mutations and calls apiClient on sync', async () => {
    await offlineDb.outbox_mutations.add({
      domain: 'attendance',
      endpoint: '/sync/batch',
      method: 'POST',
      payload: { foo: 'bar' },
      status: 'PENDING',
      userId: 'teacher-1',
    } as any);

    vi.mocked(client.apiClient).mockResolvedValueOnce({
      syncedCount: 1,
      processedOperationIds: ['mock-op-1'],
      duplicatesIgnored: 0,
    });

    const result = await syncEngine.flushOutbox();
    expect(result).toBeDefined();
    expect(client.apiClient).toHaveBeenCalled();
  });

  it('provides online/offline state querying', () => {
    expect(typeof syncEngine.isOnline()).toBe('boolean');
    expect(typeof syncEngine.isSyncing()).toBe('boolean');
  });

  it('flushes outbox and sends both RECORD_HOMEWORK_ONSITE and RECORD_ATTENDANCE in batch payload to /sync/batch', async () => {
    const hwMutationId = await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        sessionId: 'session-1',
        status: 'CHECKED_ONSITE',
        recordedMethod: 'QR_SCAN',
        score: 10,
        clientTimestamp: 1700000000000,
      },
    });

    const attMutationId = await offlineDb.outbox_mutations.add({
      type: 'RECORD_ATTENDANCE',
      payload: {
        sessionId: 'session-1',
        studentId: 'student-1',
        status: 'PRESENT',
        recordingMethod: 'QR_SCAN',
        clientTimestamp: 1700000000000,
      },
    });

    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [
        { mutationId: hwMutationId, status: 'SUCCESS' },
        { mutationId: attMutationId, status: 'SUCCESS' },
      ],
    });

    const result = await syncEngine.flushOutbox();

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);

    expect(client.apiClient).toHaveBeenCalledWith(
      expect.stringContaining('/sync/batch'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );

    const callBody = JSON.parse(vi.mocked(client.apiClient).mock.calls[0][1]?.body as string);
    expect(callBody).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: hwMutationId,
          type: 'RECORD_HOMEWORK_ONSITE',
          payload: expect.objectContaining({
            assessmentId: 'assessment-1',
            studentId: 'student-1',
            sessionId: 'session-1',
            status: 'CHECKED_ONSITE',
            score: 10,
          }),
        }),
        expect.objectContaining({
          id: attMutationId,
          type: 'RECORD_ATTENDANCE',
          payload: expect.objectContaining({
            sessionId: 'session-1',
            studentId: 'student-1',
            status: 'PRESENT',
          }),
        }),
      ]),
    );

    const remaining = await offlineDb.getPendingMutations();
    expect(remaining).toHaveLength(0);
  });

  it('only marks outbox item as SYNCED/deleted if backend explicitly returns status: SUCCESS', async () => {
    const hwMutationId = await offlineDb.outbox_mutations.add({
      type: 'RECORD_HOMEWORK_ONSITE',
      payload: {
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        sessionId: 'session-1',
      },
    });

    const attMutationId = await offlineDb.outbox_mutations.add({
      type: 'RECORD_ATTENDANCE',
      payload: {
        sessionId: 'session-1',
        studentId: 'student-1',
      },
    });

    vi.mocked(client.apiClient).mockResolvedValueOnce({
      success: true,
      results: [
        { mutationId: hwMutationId, status: 'SUCCESS' },
        { mutationId: attMutationId, status: 'FAILED', error: 'Student not enrolled' },
      ],
    });

    const result = await syncEngine.flushOutbox();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);

    const pending = await offlineDb.getPendingMutations();
    expect(pending.some((m) => m.id === hwMutationId)).toBe(false);
    const failedItem = pending.find((m) => m.id === attMutationId);
    expect(failedItem).toBeDefined();
    expect(failedItem?.status).toBe('FAILED');
  });
});
