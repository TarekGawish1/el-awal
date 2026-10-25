import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineDb } from '../db';
import { syncEngine } from '../sync-engine';
import { bootstrapManager } from '../bootstrap-manager';
import { useAuthStore } from '@/features/auth/store/auth.store';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
  refreshAccessToken: vi.fn().mockResolvedValue(true),
  isAccessTokenExpiredOrExpiring: vi.fn().mockReturnValue(false),
}));

describe('SEC-17 / Phase 4A.1: IndexedDB Offline Account Isolation & Lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear outbox and in-memory caches
    (offlineDb as any).memoryOutbox.clear();
    offlineDb.core.clearMemoryEntityCaches();
    await offlineDb.setMetadata('lastBootstrapUserId', null);
    await offlineDb.setMetadata('lastBootstrapTimestamp', null);
    useAuthStore.getState().clearSession();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('el_awal_token', 'test-jwt');
      localStorage.setItem('el_awal_refresh_token', 'test-refresh');
    }
    (bootstrapManager as any).lastBootstrapAt = 0;
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('1. User A cannot read User B\'s offline data after an account switch', async () => {
    // Setup: User A logs in and bootstraps
    useAuthStore.setState({ user: { id: 'teacher-user-a', fullName: 'User A' } as any, isAuthenticated: true });
    await offlineDb.setMetadata('lastBootstrapUserId', 'teacher-user-a');

    await offlineDb.bulkPutStudents([
      { id: 'stu-a-1', fullName: 'طالب أ 1', studentCode: 'A001', qrCodeToken: 'qr-a-1', gradeLevel: 'G1' },
      { id: 'stu-a-2', fullName: 'طالب أ 2', studentCode: 'A002', qrCodeToken: 'qr-a-2', gradeLevel: 'G1' },
    ]);
    await offlineDb.bulkPutGroups([
      { id: 'group-a-1', name: 'مجموعة أ', gradeLevel: 'G1', academicYear: '2026-2027' },
    ]);

    // User A can read their own data
    const studentsA = await offlineDb.getStudentsOffline();
    expect(studentsA.length).toBe(2);
    expect(studentsA.map((s) => s.id)).toEqual(['stu-a-1', 'stu-a-2']);
    const groupsA = await offlineDb.getGroupsOffline();
    expect(groupsA.length).toBe(1);

    // Act: Account switch to User B
    useAuthStore.setState({ user: { id: 'teacher-user-b', fullName: 'User B' } as any, isAuthenticated: true });

    // Assert: Before User B bootstraps, User B CANNOT read User A's offline data
    const studentsBeforeSync = await offlineDb.getStudentsOffline();
    expect(studentsBeforeSync).toEqual([]);

    const groupsBeforeSync = await offlineDb.getGroupsOffline();
    expect(groupsBeforeSync).toEqual([]);

    const rosterBeforeSync = await offlineDb.getRoster('group-a-1');
    expect(rosterBeforeSync).toBeNull();

    const singleStudent = await offlineDb.getStudentByIdOffline('stu-a-1');
    expect(singleStudent).toBeNull();

    // Act: User B performs an online bootstrap sync with their own server dataset
    vi.mocked(client.apiClient).mockResolvedValueOnce({
      snapshotVersion: 'v2-user-b',
      timestamp: Date.now(),
      isDelta: false,
      students: [
        { id: 'stu-b-1', fullName: 'طالب ب 1', studentCode: 'B001', qrCodeToken: 'qr-b-1', gradeLevel: 'G2' },
      ],
      groups: [
        { id: 'group-b-1', name: 'مجموعة ب', gradeLevel: 'G2', academicYear: '2026-2027' },
      ],
      sessions: [],
      schedules: [],
      payments: [],
      assessments: [],
      courses: [],
      booklets: [],
      attendance: [],
      homework: [],
    });

    const bootstrapResult = await bootstrapManager.performBootstrap({ forceFull: false });
    expect(bootstrapResult.success).toBe(true);

    // Assert: User B now has their own dataset, and User A's data was reconciled/pruned
    const studentsB = await offlineDb.getStudentsOffline();
    expect(studentsB.length).toBe(1);
    expect(studentsB[0].id).toBe('stu-b-1');
    expect(studentsB[0].fullName).toBe('طالب ب 1');

    const groupsB = await offlineDb.getGroupsOffline();
    expect(groupsB.length).toBe(1);
    expect(groupsB[0].id).toBe('group-b-1');

    // Confirm lastBootstrapUserId was updated to User B
    const currentBootstrapUser = await offlineDb.getMetadata<string>('lastBootstrapUserId');
    expect(currentBootstrapUser).toBe('teacher-user-b');
  });

  it('2. User B cannot replay User A\'s queued mutations under User B\'s identity', async () => {
    // User A is logged in and enqueues offline mutations
    useAuthStore.setState({ user: { id: 'user-a', fullName: 'User A' } as any, isAuthenticated: true });

    const mutA1 = await syncEngine.enqueue('attendance', '/attendance', 'POST', {
      sessionId: 'sess-a',
      studentId: 'stu-a',
      status: 'PRESENT',
    });
    const mutA2 = await syncEngine.enqueue('finance', '/payment', 'POST', {
      studentId: 'stu-a',
      amount: 250,
    });

    expect(await offlineDb.getUserPendingCount('user-a')).toBe(2);

    // Switch account to User B
    useAuthStore.setState({ user: { id: 'user-b', fullName: 'User B' } as any, isAuthenticated: true });

    // User B's pending mutations should be 0
    const pendingB = await offlineDb.getPendingMutations('user-b');
    expect(pendingB.length).toBe(0);
    expect(await offlineDb.getUserPendingCount('user-b')).toBe(0);

    // Spy on apiClient to monitor what gets synced
    const syncSpy = vi.mocked(client.apiClient);
    syncSpy.mockClear();

    // User B triggers flushOutbox
    const flushResult = await syncEngine.flushOutbox();

    // Assert: User B synced 0 items, and API was never called for User A's mutations
    expect(flushResult.synced).toBe(0);
    expect(flushResult.failed).toBe(0);
    expect(syncSpy).not.toHaveBeenCalled();

    // User A's mutations remain intact in outbox
    const allPending = await offlineDb.getPendingMutations();
    const aRecords = allPending.filter((m) => m.userId === 'user-a');
    expect(aRecords.length).toBe(2);
    expect(aRecords.map((m) => m.id)).toContain(mutA1);
    expect(aRecords.map((m) => m.id)).toContain(mutA2);
  });

  it('3. Logging out does not expose private IndexedDB data through offline UI or memory caches', async () => {
    // User A logs in and has offline data
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    await offlineDb.setMetadata('lastBootstrapUserId', 'user-a');

    await offlineDb.bulkPutStudents([
      { id: 'stu-private-1', fullName: 'طالب سري', studentCode: 'P01', qrCodeToken: 'qr-p1' },
    ]);
    await offlineDb.bulkPutGroups([
      { id: 'grp-private-1', name: 'مجموعة سرية' },
    ]);

    // Data is accessible when authenticated
    expect((await offlineDb.getStudentsOffline()).length).toBe(1);
    expect((await offlineDb.getGroupsOffline()).length).toBe(1);

    // User logs out (clearSession and clear in-memory entity cache)
    useAuthStore.getState().clearSession();
    offlineDb.clearMemoryEntityCaches();

    // Assert: Unauthenticated access returns empty results
    expect(useAuthStore.getState().user).toBeNull();
    expect(await offlineDb.getStudentsOffline()).toEqual([]);
    expect(await offlineDb.getGroupsOffline()).toEqual([]);
    expect(await offlineDb.getRoster('grp-private-1')).toBeNull();
    expect(await offlineDb.getStudentByIdOffline('stu-private-1')).toBeNull();
    expect(await offlineDb.getPaymentsOffline()).toEqual([]);

    // Assert: Memory caches are cleared
    expect(offlineDb.core.memoryStudents.size).toBe(0);
    expect(offlineDb.core.memoryGroups.size).toBe(0);
  });

  it('4. Unsynchronized operations belonging to User A are not silently discarded', async () => {
    // User A enqueues operations
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });
    const mutId1 = await syncEngine.enqueue('finance', '/payment', 'POST', { amount: 500 });
    const mutId2 = await syncEngine.enqueue('attendance', '/attendance', 'POST', { status: 'LATE' });

    // User A logs out
    useAuthStore.getState().clearSession();

    // Verify mutations remain in outbox storage
    expect(await offlineDb.getUserPendingCount('user-a')).toBe(2);

    // User B logs in
    useAuthStore.setState({ user: { id: 'user-b' } as any, isAuthenticated: true });

    // User B performs operations and logs out
    await syncEngine.enqueue('attendance', '/attendance', 'POST', { status: 'PRESENT' });
    expect(await offlineDb.getUserPendingCount('user-b')).toBe(1);

    // User A logs back in
    useAuthStore.setState({ user: { id: 'user-a' } as any, isAuthenticated: true });

    // Assert: User A's operations are completely intact
    const userAPending = await offlineDb.getPendingMutations('user-a');
    expect(userAPending.length).toBe(2);
    expect(userAPending[0].id).toBe(mutId1);
    expect(userAPending[1].id).toBe(mutId2);
  });

  it('5. Existing offline learning, attendance, and synchronization behavior remains functional for authorized user', async () => {
    // Authorized session
    useAuthStore.setState({ user: { id: 'teacher-active' } as any, isAuthenticated: true });
    await offlineDb.setMetadata('lastBootstrapUserId', 'teacher-active');

    // Populate offline schema
    await offlineDb.bulkPutGroups([
      { id: 'group-10', name: 'أولى ثانوي عام', gradeLevel: 'الصف الأول الثانوي', monthlyFee: 300 },
    ]);
    await offlineDb.bulkPutStudents([
      {
        id: 'stu-10',
        fullName: 'أحمد علي',
        studentCode: 'STU-10',
        qrCodeToken: 'qr-10',
        gradeLevel: 'الصف الأول الثانوي',
        groupId: 'group-10',
      },
    ]);

    // 1. Student and Group offline reads with filters
    const students = await offlineDb.getStudentsOffline({ search: 'أحمد' });
    expect(students.length).toBe(1);
    expect(students[0].fullName).toBe('أحمد علي');

    const groups = await offlineDb.getGroupsOffline({ gradeLevel: 'الصف الأول الثانوي' });
    expect(groups.length).toBe(1);
    expect(groups[0].name).toBe('أولى ثانوي عام');

    // 2. Offline Roster retrieval
    const roster = await offlineDb.getRoster('group-10');
    expect(roster).not.toBeNull();
    expect(roster?.students.length).toBe(1);
    expect(roster?.students[0].fullName).toBe('أحمد علي');

    // 3. Offline attendance mutation enqueueing and syncing
    const mutId = await syncEngine.enqueue('attendance', '/attendance', 'POST', {
      sessionId: 'sess-10',
      studentId: 'stu-10',
      status: 'PRESENT',
    });

    const pending = await offlineDb.getPendingMutations('teacher-active');
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(mutId);

    // 4. Mock sync flush
    vi.mocked(client.apiClient).mockResolvedValueOnce({ success: true, processed: 1 });
    const flushRes = await syncEngine.flushOutbox({ force: true });
    expect(flushRes.synced).toBe(1);

    // 5. Verify mutation removed after successful sync
    const pendingAfter = await offlineDb.getPendingMutations('teacher-active');
    expect(pendingAfter.length).toBe(0);
  });
});
