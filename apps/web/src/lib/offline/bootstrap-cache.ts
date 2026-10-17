export interface BootstrapCachePayload {
  students: any[];
  groups: any[];
  sessions: any[];
  attendance: any[];
  homework: any[];
  payments: any[];
  booklets: any[];
  assessments: any[];
}

export function invalidateBootstrapQueries(qc: any, payload: BootstrapCachePayload): void {
  if (!qc) return;
  if (payload.students.length > 0) qc.invalidateQueries({ queryKey: ['students'] });
  if (payload.groups.length > 0) qc.invalidateQueries({ queryKey: ['groups'] });
  if (payload.sessions.length > 0) {
    qc.invalidateQueries({ queryKey: ['today-sessions'] });
    qc.invalidateQueries({ queryKey: ['sessions'] });
  }
  if (payload.attendance.length > 0) {
    qc.invalidateQueries({ queryKey: ['attendance'] });
    qc.invalidateQueries({ queryKey: ['sessions'] });
    qc.invalidateQueries({ queryKey: ['today-sessions'] });
  }
  if (payload.homework.length > 0) {
    qc.invalidateQueries({ queryKey: ['homework-records'] });
    qc.invalidateQueries({ queryKey: ['sessions'] });
  }
  if (payload.payments.length > 0) qc.invalidateQueries({ queryKey: ['payments'] });
  if (payload.booklets.length > 0) qc.invalidateQueries({ queryKey: ['booklets'] });
  if (payload.assessments.length > 0) qc.invalidateQueries({ queryKey: ['assessments'] });
}
