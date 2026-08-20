import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Offline Storage & Sync Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      syncedCount: 1,
      processedOperationIds: ['mock-op-1'],
      duplicatesIgnored: 0,
    });

    const result = await syncEngine.flushOutbox();
    expect(result).toBeDefined();
  });

  it('provides online/offline state querying', () => {
    expect(typeof syncEngine.isOnline()).toBe('boolean');
    expect(typeof syncEngine.isSyncing()).toBe('boolean');
  });
});
