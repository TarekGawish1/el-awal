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
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      syncedCount: 1,
      processedOperationIds: ['mock-op-1'],
      duplicatesIgnored: 0,
    });

    const result = await syncEngine.flushOutbox();
    expect(result).toBeDefined();
  });

  it('undoes offline group and student edits using their rollback snapshots', async () => {
    const originalGroup = { id: 'group-1', name: 'المجموعة الأصلية', monthlyFee: 100 };
    const originalStudent = {
      id: 'student-1',
      fullName: 'الطالب الأصلي',
      studentCode: 'STU-1',
      qrCodeToken: 'qr-1',
    };
    await offlineDb.bulkPutGroups([{ ...originalGroup, monthlyFee: 250 }]);
    await offlineDb.bulkPutStudents([{ ...originalStudent, fullName: 'الطالب المعدل' }]);

    const groupMutationId = await syncEngine.enqueue(
      'groups',
      '/groups/group-1',
      'PATCH',
      { name: 'المجموعة المعدلة', monthlyFee: 250 },
      { rollbackData: originalGroup },
    );
    const studentMutationId = await syncEngine.enqueue(
      'students',
      '/students/student-1',
      'PATCH',
      { fullName: 'الطالب المعدل' },
      { rollbackData: originalStudent },
    );

    await syncEngine.undoMutation(groupMutationId);
    await syncEngine.undoMutation(studentMutationId);

    expect(await offlineDb.getGroupByIdOffline('group-1')).toMatchObject(originalGroup);
    expect(await offlineDb.getStudentByIdOffline('student-1')).toMatchObject(originalStudent);
    expect(await offlineDb.getPendingMutations()).toHaveLength(0);
  });

  it('provides online/offline state querying', () => {
    expect(typeof syncEngine.isOnline()).toBe('boolean');
    expect(typeof syncEngine.isSyncing()).toBe('boolean');
  });
});
