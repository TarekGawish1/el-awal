import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toLocalDateStr } from '@/features/schedules/utils/time.utils';

// Helper extracting the exact selection logic from QrHomeworkScanner for automated unit testing
function resolveAutoSelectedHomework({
  allAssessments,
  groupSessions,
  sessionId,
  sessionReport,
  groupId,
}: {
  allAssessments: any[];
  groupSessions: any[];
  sessionId: string;
  sessionReport?: any;
  groupId?: string;
}) {
  const effectiveGroupId = groupId || sessionReport?.groupId;

  const matchingHw = allAssessments.filter(
    (a: any) =>
      (a.type === 'ASSIGNMENT' || a.assessmentType === 'ASSIGNMENT') &&
      (!effectiveGroupId || !a.groupId || a.groupId === effectiveGroupId)
  );

  const currentSession = groupSessions.find((s) => s.id === sessionId) || {
    id: sessionId,
    sessionDate: sessionReport?.sessionDate || new Date().toISOString(),
    startTime: '',
    topic: sessionReport?.topic,
  };

  const curDateStr = toLocalDateStr(currentSession.sessionDate);
  const curTimeStr = currentSession.startTime || '23:59';
  const curDateTime = `${curDateStr}T${curTimeStr}`;

  const previousSessions = groupSessions.filter((s) => {
    if (s.id === sessionId || s.isCancelled) return false;
    const sDateStr = toLocalDateStr(s.sessionDate);
    const sTimeStr = s.startTime || '00:00';
    return `${sDateStr}T${sTimeStr}` < curDateTime;
  });

  previousSessions.sort((a, b) => {
    const da = `${toLocalDateStr(a.sessionDate)}T${a.startTime || '00:00'}`;
    const db = `${toLocalDateStr(b.sessionDate)}T${b.startTime || '00:00'}`;
    return db.localeCompare(da);
  });

  const previousSession = previousSessions[0] || null;
  const dynamicLabel = previousSession
    ? `واجب الحصة السابقة (${previousSession.topic || toLocalDateStr(previousSession.sessionDate)})`
    : 'واجب الحصة الدراسية';

  let bestHomework: any = null;

  // Priority 1: Check existing recorded homework in this session
  const existingRecordedId = sessionReport?.homeworkRecords?.find(
    (hr: any) => hr.assessmentId && hr.assessmentId !== 'default-session-homework'
  )?.assessmentId;
  if (existingRecordedId) {
    bestHomework = matchingHw.find((a: any) => a.id === existingRecordedId);
  }

  // Priority 2: Homework whose dueDate is today's session (assigned in previous session for submission today)
  if (!bestHomework && curDateStr) {
    bestHomework = matchingHw.find((a: any) => a.dueDate && toLocalDateStr(a.dueDate) === curDateStr);
  }

  // Priority 3: Homework explicitly titled after or matching previous session's topic or date
  if (!bestHomework && previousSession) {
    const prevDateStr = toLocalDateStr(previousSession.sessionDate);
    bestHomework = matchingHw.find((a: any) => {
      const title = a.title?.toLowerCase() || '';
      if (previousSession.topic && title.includes(previousSession.topic.toLowerCase())) return true;
      if (title.includes(prevDateStr)) return true;
      return false;
    });
  }

  // Priority 4: Homework created between previous session and current session
  if (!bestHomework && previousSession) {
    const prevTime = new Date(previousSession.sessionDate).getTime();
    const currTime = new Date(currentSession.sessionDate).getTime();
    bestHomework = matchingHw.find((a: any) => {
      if (!a.createdAt) return false;
      const created = new Date(a.createdAt).getTime();
      return created >= prevTime - 24 * 3600 * 1000 && created <= currTime;
    });
  }

  return {
    selectedId: bestHomework ? bestHomework.id : 'default-session-homework',
    selectedTitle: bestHomework ? bestHomework.title : null,
    dynamicLabel,
    previousSession,
  };
}

describe('Previous Session Homework Auto-Selection in QrHomeworkScanner', () => {
  const mockSessions = [
    {
      id: 'session-prev',
      sessionDate: '2026-09-01T10:00:00Z',
      startTime: '10:00',
      topic: 'قوانين نيوتن للحركة',
      isCancelled: false,
    },
    {
      id: 'session-curr',
      sessionDate: '2026-09-08T10:00:00Z',
      startTime: '10:00',
      topic: 'تطبيقات على الحركة الدائرية',
      isCancelled: false,
    },
  ];

  it('selects homework whose dueDate is the current session date (due today)', () => {
    const assessments = [
      {
        id: 'hw-unrelated',
        title: 'واجب قديم عشوائي',
        type: 'ASSIGNMENT',
        dueDate: '2026-08-20T00:00:00Z',
      },
      {
        id: 'hw-due-today',
        title: 'واجب نيوتن المستحق اليوم',
        type: 'ASSIGNMENT',
        dueDate: '2026-09-08T00:00:00Z',
      },
    ];

    const result = resolveAutoSelectedHomework({
      allAssessments: assessments,
      groupSessions: mockSessions,
      sessionId: 'session-curr',
    });

    expect(result.selectedId).toBe('hw-due-today');
    expect(result.selectedTitle).toBe('واجب نيوتن المستحق اليوم');
    expect(result.dynamicLabel).toBe('واجب الحصة السابقة (قوانين نيوتن للحركة)');
  });

  it('selects homework titled with previous session topic when dueDate is not set', () => {
    const assessments = [
      {
        id: 'hw-test-random',
        title: 'fdfsfsdfsfslfsf',
        type: 'ASSIGNMENT',
      },
      {
        id: 'hw-previous-topic',
        title: 'حل مسائل قوانين نيوتن للحركة',
        type: 'ASSIGNMENT',
      },
    ];

    const result = resolveAutoSelectedHomework({
      allAssessments: assessments,
      groupSessions: mockSessions,
      sessionId: 'session-curr',
    });

    expect(result.selectedId).toBe('hw-previous-topic');
    expect(result.selectedTitle).toBe('حل مسائل قوانين نيوتن للحركة');
  });

  it('selects homework created between previous session and current session when no title/dueDate match', () => {
    const assessments = [
      {
        id: 'hw-old',
        title: 'واجب شهر اغسطس',
        type: 'ASSIGNMENT',
        createdAt: '2026-08-15T00:00:00Z',
      },
      {
        id: 'hw-assigned-in-prev-session',
        title: 'واجب تدريبي 2',
        type: 'ASSIGNMENT',
        createdAt: '2026-09-02T14:00:00Z',
      },
    ];

    const result = resolveAutoSelectedHomework({
      allAssessments: assessments,
      groupSessions: mockSessions,
      sessionId: 'session-curr',
    });

    expect(result.selectedId).toBe('hw-assigned-in-prev-session');
  });

  it('falls back to default-session-homework with previous session label if no matching homework exists', () => {
    const assessments: any[] = [];

    const result = resolveAutoSelectedHomework({
      allAssessments: assessments,
      groupSessions: mockSessions,
      sessionId: 'session-curr',
    });

    expect(result.selectedId).toBe('default-session-homework');
    expect(result.dynamicLabel).toBe('واجب الحصة السابقة (قوانين نيوتن للحركة)');
  });
});
