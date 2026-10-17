import { AttendanceStatus, AssessmentType } from '@prisma/client';

export function isSessionHomeworkApplicable(r: any): boolean {
  const studentHw = (r.session?.homeworkRecords?.length ?? 0) > 0;
  const sessionTrackedHw = (r.session?._count?.homeworkRecords ?? 0) > 0;
  const groupHasHw = (r.session?.group?._count?.assessments ?? 0) > 0;
  return studentHw || sessionTrackedHw || groupHasHw;
}

export function calculateNextSession(primaryGroup: any) {
  if (!primaryGroup?.schedules?.length) return null;

  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const currentHourMinute = today.getHours() * 60 + today.getMinutes();

  let nextSchedule: any = null;
  let daysUntilNext = 7;

  for (const schedule of primaryGroup.schedules) {
    const schDay = schedule.dayOfWeek;
    const [sh, sm] = (schedule.startTime || '00:00').split(':').map(Number);
    const schTime = sh * 60 + sm;

    let diff = schDay - currentDayOfWeek;
    if (diff < 0 || (diff === 0 && schTime <= currentHourMinute)) {
      diff += 7;
    }
    if (diff < daysUntilNext) {
      daysUntilNext = diff;
      nextSchedule = schedule;
    } else if (diff === daysUntilNext && nextSchedule) {
      const [nsh, nsm] = nextSchedule.startTime.split(':').map(Number);
      if (schTime < nsh * 60 + nsm) {
        nextSchedule = schedule;
      }
    }
  }

  if (nextSchedule) {
    const nextDate = new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
    return {
      dayOfWeek: nextSchedule.dayOfWeek,
      startTime: nextSchedule.startTime,
      endTime: nextSchedule.endTime,
      location: nextSchedule.location || 'مقر السنتر',
      nextDate: nextDate.toISOString(),
      groupName: primaryGroup.name,
    };
  }
  return null;
}

export function mapAttendanceHistory(safeAttendanceHistory: any[], primaryGroup: any) {
  return safeAttendanceHistory.map((a: any) => {
    const hasHw = isSessionHomeworkApplicable(a);
    const hwRecord = a.session?.homeworkRecords?.[0];
    let homeworkStatus = 'NO_HOMEWORK';

    if (hasHw) {
      if (hwRecord?.status) {
        homeworkStatus = hwRecord.status;
      } else {
        homeworkStatus = a.status === AttendanceStatus.PRESENT ? 'MISSING' : 'EXCUSED';
      }
    }

    return {
      id: a.id,
      sessionId: a.sessionId,
      groupName: a.session?.group?.name || primaryGroup?.name || 'المجموعة الدراسية',
      sessionDate: a.session?.sessionDate || a.recordedAt,
      status: a.status,
      homeworkStatus,
      hasHomework: hasHw,
      recordedAt: a.recordedAt,
    };
  });
}

export function mapPaymentHistory(safePaymentHistory: any[]) {
  return safePaymentHistory.map((p) => ({
    id: p.id,
    paymentType: p.paymentType,
    periodMonth: p.periodMonth,
    periodYear: p.periodYear,
    amountPaid: Number(p.amountPaid || 0),
    amountExpected: Number(p.amountExpected || 0),
    paymentStatus: p.paymentStatus,
    createdAt: p.createdAt,
  }));
}

export function mapAssignments(safeAssignments: any[]) {
  return safeAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueDate: a.dueDate,
    totalScore: Number(a.totalScore || 0),
    _count: a._count,
    submissions: (a.submissions || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
    })),
    group: a.group || a.targetGroups?.[0] || null,
    targetGroups: a.targetGroups,
  }));
}

export function mapExams(safeExams: any[]) {
  return safeExams.map((e) => ({
    id: e.id,
    title: e.title,
    dueDate: e.dueDate,
    totalScore: Number(e.totalScore || 0),
    group: e.group || e.targetGroups?.[0] || null,
    targetGroups: e.targetGroups,
    submissions: (e.submissions || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
    })),
  }));
}
