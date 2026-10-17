import { toLocalDateStr } from '@/features/schedules/utils/time.utils';
import { offlineDb } from '@/lib/offline/db';

export interface AutoHomeworkResult {
  availableAssessments: Array<{ id: string; title: string }>;
  autoHomeworkLabel: string;
  bestHomeworkId: string;
}

export function resolveAutoHomeworkAssessment(params: {
  sessionId: string;
  effectiveGroupId?: string;
  sessionReport?: any;
  assessmentTitle: string;
  allAssessments: any[];
  groupSessions: any[];
}): AutoHomeworkResult {
  const {
    sessionId,
    effectiveGroupId,
    sessionReport,
    assessmentTitle,
    allAssessments,
    groupSessions,
  } = params;

  const matchingHw = allAssessments.filter(
    (a: any) =>
      (a.type === 'ASSIGNMENT' || a.assessmentType === 'ASSIGNMENT') &&
      (!effectiveGroupId || !a.groupId || a.groupId === effectiveGroupId)
  );
  const availableAssessments = matchingHw.map((a: any) => ({ id: a.id, title: a.title }));

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
    : assessmentTitle;

  let bestHomework: any = null;

  const existingRecordedId = sessionReport?.homeworkRecords?.find(
    (hr: any) => hr.assessmentId && hr.assessmentId !== 'default-session-homework'
  )?.assessmentId;
  if (existingRecordedId) {
    bestHomework = matchingHw.find((a: any) => a.id === existingRecordedId);
  }

  if (!bestHomework && curDateStr) {
    bestHomework = matchingHw.find((a: any) => a.dueDate && toLocalDateStr(a.dueDate) === curDateStr);
  }

  if (!bestHomework && previousSession) {
    const prevDateStr = toLocalDateStr(previousSession.sessionDate);
    bestHomework = matchingHw.find((a: any) => {
      const title = a.title?.toLowerCase() || '';
      if (previousSession.topic && title.includes(previousSession.topic.toLowerCase())) return true;
      if (title.includes(prevDateStr)) return true;
      return false;
    });
  }

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
    availableAssessments,
    autoHomeworkLabel: dynamicLabel,
    bestHomeworkId: bestHomework ? bestHomework.id : 'default-session-homework',
  };
}

export async function syncSessionReportToOfflineDb(params: {
  sessionReport?: any;
  groupId?: string;
  sessionId: string;
}) {
  const { sessionReport, groupId, sessionId } = params;
  if (!sessionReport) return new Set<string>();

  if (sessionReport.records && Array.isArray(sessionReport.records)) {
    for (const r of sessionReport.records) {
      if (r.studentId && r.fullName !== 'طالب غير متزامن' && !String(r.studentId).startsWith('qr_tok_')) {
        offlineDb.getStudentByIdOffline(r.studentId).then((existing) => {
          offlineDb.putStudent({
            id: r.studentId,
            fullName: r.fullName || r.studentName || existing?.fullName || 'طالب',
            studentCode: r.studentCode || existing?.studentCode || '',
            qrCodeToken: r.qrCodeToken || existing?.qrCodeToken || '',
            groupId: sessionReport.groupId || groupId || existing?.groupId || '',
            gradeLevel: r.gradeLevel || existing?.gradeLevel || '',
          }).catch(() => {});
        });
      }
    }
  }

  const absentStudentIds = new Set<string>(
    sessionReport.records?.filter((r: any) => r.status === 'ABSENT').map((r: any) => String(r.studentId)) || []
  );

  if (sessionReport.homeworkRecords && Array.isArray(sessionReport.homeworkRecords)) {
    for (const hr of sessionReport.homeworkRecords) {
      if (absentStudentIds.has(hr.studentId)) continue;
      offlineDb.homework_records
        .put({
          id: hr.id,
          assessmentId: hr.assessmentId,
          studentId: hr.studentId,
          sessionId: hr.sessionId,
          status: hr.status,
          score: hr.score !== null && hr.score !== undefined ? Number(hr.score) : undefined,
          feedback: hr.feedback,
          recordedMethod: hr.recordedMethod,
          clientTimestamp: hr.clientTimestamp ? new Date(hr.clientTimestamp).getTime() : Date.now(),
          syncStatus: 'SYNCED',
        })
        .catch(() => {});
    }
  }

  for (const absentId of absentStudentIds) {
    offlineDb.deleteHomeworkForSessionStudent(sessionId, absentId).catch(() => {});
  }

  return absentStudentIds;
}
