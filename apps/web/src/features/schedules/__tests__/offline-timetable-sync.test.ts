import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineDb, SessionEntity } from '@/lib/offline/db';

describe('Offline Timetable Reconciliation & Chronological Sorting', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear in-memory and indexeddb
    const all = await offlineDb.getSessionsOffline();
    for (const s of all) {
      await offlineDb.removeSession(s.id);
    }
  });

  it('syncSessionsSnapshot prunes stale/deleted sessions from local storage', async () => {
    // 1. Seed local sessions including an old/deleted session
    const oldSession: SessionEntity = {
      id: 'session-stale-deleted',
      groupId: 'group-1',
      sessionDate: '2026-09-06',
      startTime: '10:00',
      topic: 'حصة تجريبية تم حذفها',
      status: 'UPCOMING',
    };

    const activeSession: SessionEntity = {
      id: 'session-active-1',
      groupId: 'group-1',
      sessionDate: '2026-09-06',
      startTime: '18:00',
      topic: 'حصة اختبار رصد الحضور',
      status: 'UPCOMING',
    };

    await offlineDb.bulkPutSessions([oldSession, activeSession]);
    const beforeSync = await offlineDb.getSessionsOffline();
    expect(beforeSync.length).toBe(2);

    // 2. Server only has activeSession (oldSession was deleted on server)
    await offlineDb.syncSessionsSnapshot([activeSession]);

    // 3. Verify oldSession is completely pruned from offline store
    const afterSync = await offlineDb.getSessionsOffline();
    expect(afterSync.length).toBe(1);
    expect(afterSync[0].id).toBe('session-active-1');
    expect(afterSync.find((s) => s.id === 'session-stale-deleted')).toBeUndefined();
  });

  it('getSessionsOffline sorts sessions strictly chronologically by date and start time', async () => {
    // Insert in unsorted order (e.g. November before September, late evening before morning)
    const s1: SessionEntity = {
      id: 'uuid-nov',
      groupId: 'group-1',
      sessionDate: '2026-11-23',
      startTime: '14:00',
      topic: 'حصة نوفمبر',
    };
    const s2: SessionEntity = {
      id: 'uuid-sep-evening',
      groupId: 'group-1',
      sessionDate: '2026-09-06',
      startTime: '18:00',
      topic: 'حصة سبتمبر مساء',
    };
    const s3: SessionEntity = {
      id: 'uuid-sep-morning',
      groupId: 'group-1',
      sessionDate: '2026-09-06',
      startTime: '10:00',
      topic: 'حصة سبتمبر صباحا',
    };

    await offlineDb.bulkPutSessions([s1, s2, s3]);

    const result = await offlineDb.getSessionsOffline();
    expect(result.length).toBe(3);

    // Earliest must be 2026-09-06 at 10:00
    expect(result[0].id).toBe('uuid-sep-morning');
    // Second must be 2026-09-06 at 18:00
    expect(result[1].id).toBe('uuid-sep-evening');
    // Last must be 2026-11-23
    expect(result[2].id).toBe('uuid-nov');
  });

  it('getSessionsOffline filters strictly by academicYear and academicTerm', async () => {
    const sCurrent: SessionEntity = {
      id: 'session-2026-term1',
      groupId: 'group-2026-t1',
      sessionDate: '2026-09-06',
      startTime: '17:00',
      group: {
        id: 'group-2026-t1',
        name: 'مجموعة 1',
        gradeLevel: 'الصف الثالث الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'FIRST_TERM',
      },
    };

    const sOtherTerm: SessionEntity = {
      id: 'session-2026-term2',
      groupId: 'group-2026-t2',
      sessionDate: '2026-09-06',
      startTime: '19:00',
      group: {
        id: 'group-2026-t2',
        name: 'مجموعة 2',
        gradeLevel: 'الصف الثالث الثانوي',
        academicYear: '2026-2027',
        academicTerm: 'SECOND_TERM',
      },
    };

    await offlineDb.bulkPutSessions([sCurrent, sOtherTerm]);

    // Query for FIRST_TERM only
    const filtered = await offlineDb.getSessionsOffline({
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('session-2026-term1');
  });
});
