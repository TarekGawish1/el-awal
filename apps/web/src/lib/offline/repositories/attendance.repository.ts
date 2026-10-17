import { IOfflineDatabase } from '../types';

export class AttendanceRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryOutbox() {
    return this.db.core.memoryOutbox;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getPendingMutations() {
    return this.db.getPendingMutations();
  }
  private getSessionReport(sessionId: string) {
    return this.db.getSessionReport(sessionId);
  }
  private getSessionsOffline(filterOrGroupId?: any, dateStr?: string) {
    return this.db.getSessionsOffline(filterOrGroupId, dateStr);
  }
  private getRoster(groupId: string) {
    return this.db.getRoster(groupId);
  }
  private getGroupByIdOffline(id: string | number) {
    return this.db.getGroupByIdOffline(id);
  }
  private getStudentsOffline(options?: any) {
    return this.db.getStudentsOffline(options);
  }
  private findStudentByQrToken(qrCodeToken: string, preferredGroupId?: string) {
    return this.db.findStudentByQrToken(qrCodeToken, preferredGroupId);
  }
  private deleteHomeworkForSessionStudent(sessionId: string, studentId: string) {
    return this.db.deleteHomeworkForSessionStudent(sessionId, studentId);
  }
  private cacheSessionReport(sessionId: string, report: any) {
    return this.db.cacheSessionReport(sessionId, report);
  }
  private removeMutation(id: string) {
    return this.db.removeMutation(id);
  }

  public async isAttendanceRecordedOffline(
    sessionId: string,
    studentId: string,
    qrCodeToken?: string,
  ): Promise<boolean> {
    const cleanSessionId = String(sessionId).trim().toLowerCase();
    const cleanStudentId = String(studentId).trim();
    const cleanToken = qrCodeToken ? String(qrCodeToken).trim() : '';

    const pending = await this.getPendingMutations();
    const isQueued = pending.some((m) => {
      if (m.domain !== 'attendance') return false;
      const p = m.payload || {};
      const matchesSession = String(p.sessionId || '').trim() === cleanSessionId;
      if (!matchesSession) return false;

      const matchesStudent =
        (p.studentId && String(p.studentId).trim() === cleanStudentId) ||
        (cleanToken && p.qrCodeToken && String(p.qrCodeToken).trim() === cleanToken);

      return matchesStudent;
    });

    return isQueued;
  }

  /**
   * Idempotency Check: Checks if a payment is already recorded in IndexedDB or queued in outbox
   */

  public async recordAttendanceOffline(
    sessionId: string,
    record: {
      studentId: string;
      status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | string;
      recordingMethod?: string;
      notes?: string;
      recordedAt?: string;
      studentName?: string;
      studentCode?: string;
    },
  ): Promise<any> {
    const cleanSessionId = String(sessionId).trim().toLowerCase();
    let currentReport = await this.getSessionReport(cleanSessionId);

    if (!currentReport) {
      const allSessions = await this.getSessionsOffline();
      const session = allSessions.find((s) => String(s.id).trim().toLowerCase() === cleanSessionId);
      const targetGroupId = session?.groupId || '';
      const roster = targetGroupId ? await this.getRoster(targetGroupId) : null;
      const group = targetGroupId ? await this.getGroupByIdOffline(targetGroupId) : null;
      const groupStudents = targetGroupId ? await this.getStudentsOffline({ groupId: targetGroupId }) : [];

      const initialStudents = roster?.students?.length ? roster.students : groupStudents;
      const studentCount = initialStudents.length;

      const sessionDateStr = session?.sessionDate;
      const startTime = session?.startTime;
      const endTime = session?.endTime;
      currentReport = {
        sessionId,
        sessionDate: session?.sessionDate || new Date().toISOString(),
        topic: session?.topic || 'رصد الحضور',
        groupId: targetGroupId,
        groupName: roster?.groupName || group?.name || session?.group?.name || 'المجموعة الدراسية',
        metrics: {
          totalEnrolled: studentCount,
          presentCount: 0,
          absentCount: 0,
          excusedCount: 0,
          attendanceRatePercentage: 0,
        },
        records: initialStudents.map((s: any) => ({
          id: `unrecorded-${s.id}`,
          studentId: s.id,
          studentCode: s.studentCode || '',
          fullName: s.fullName || s.user?.fullName || 'طالب',
          status: null,
          recordingMethod: null,
          recordedAt: null,
          notes: null,
        })),
        session: session || null,
      };
    }

    let records = Array.isArray(currentReport.records) ? [...currentReport.records] : [];

    // Filter out historical ghost records
    records = records.filter(
      (r: any) => r.fullName !== 'طالب غير متزامن' && !String(r.studentId).startsWith('qr_tok_')
    );

    const cleanInputStudentId = String(record.studentId).trim();
    let studentIdx = records.findIndex((r: any) => String(r.studentId).trim() === cleanInputStudentId);

    if (studentIdx === -1) {
      // Try resolving by studentCode, qrCodeToken, or candidate
      studentIdx = records.findIndex(
        (r: any) =>
          (record.studentCode && r.studentCode && String(r.studentCode).trim().toLowerCase() === String(record.studentCode).trim().toLowerCase()) ||
          (r.studentCode && String(r.studentCode).trim().toLowerCase() === cleanInputStudentId.toLowerCase()) ||
          (r.qrCodeToken && String(r.qrCodeToken).trim() === cleanInputStudentId)
      );
    }

    if (studentIdx === -1) {
      // Check offlineDb by QR token
      const match = await this.findStudentByQrToken(cleanInputStudentId);
      if (match?.student?.id) {
        studentIdx = records.findIndex((r: any) => String(r.studentId).trim() === String(match.student.id).trim());
      }
    }

    if (studentIdx >= 0) {
      records[studentIdx] = {
        ...records[studentIdx],
        status: record.status,
        recordingMethod: record.recordingMethod || 'QR_SCAN',
        recordedAt: record.recordedAt || new Date().toISOString(),
        notes: record.notes || records[studentIdx]?.notes || null,
      };
    } else if (record.studentName !== 'طالب غير متزامن' && !cleanInputStudentId.startsWith('qr_tok_')) {
      const updatedRecord = {
        id: `offline-${Date.now()}-${cleanInputStudentId}`,
        studentId: cleanInputStudentId,
        studentCode: record.studentCode || '',
        fullName: record.studentName || 'طالب',
        status: record.status,
        recordingMethod: record.recordingMethod || 'QR_SCAN',
        recordedAt: record.recordedAt || new Date().toISOString(),
        notes: record.notes || null,
      };
      records.push(updatedRecord);
    }

    // If student is marked ABSENT, automatically remove any homework record for this session
    if (record.status === 'ABSENT') {
      const targetId = cleanInputStudentId;
      const resolvedId =
        studentIdx >= 0 && records[studentIdx]?.studentId
          ? String(records[studentIdx].studentId).trim()
          : targetId;

      await this.deleteHomeworkForSessionStudent(cleanSessionId, targetId);
      if (resolvedId && resolvedId !== targetId) {
        await this.deleteHomeworkForSessionStudent(cleanSessionId, resolvedId);
      }

      if (studentIdx >= 0) {
        records[studentIdx] = {
          ...records[studentIdx],
          homeworkStatus: 'NOT_SUBMITTED',
          isHomeworkSubmitted: false,
          homeworkScore: null,
          homeworkFeedback: null,
          homeworkCheckedAt: null,
        };
      }
    }

    const sessionDateStr = currentReport.sessionDate || currentReport.session?.sessionDate;
    const startTime = currentReport.session?.startTime;
    const endTime = currentReport.session?.endTime;
    const totalEnrolled = Math.max(records.length, currentReport.metrics?.totalEnrolled || 0);
    const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
    const excusedCount = records.filter((r: any) => r.status === 'EXCUSED').length;
    const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;
    const attendanceRatePercentage = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

    const updatedReport = {
      ...currentReport,
      metrics: {
        totalEnrolled,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRatePercentage,
      },
      records,
      stats: {
        totalEnrolled,
        totalPresent: presentCount,
        totalAbsent: absentCount,
      },
    };

    await this.cacheSessionReport(cleanSessionId, updatedReport);
    return updatedReport;
  }

  /**
   * Reverts a single locally-recorded attendance scan back to its unrecorded state,
   * used when a teacher cancels/undoes a pending offline attendance mutation.
   */

  public async revertAttendanceRecordOffline(sessionId: string, studentId: string): Promise<void> {
    const cleanSessionId = String(sessionId).trim().toLowerCase();
    const cleanStudentId = String(studentId).trim();

    // Also delete any homework record for this student since attendance is undone/reset
    await this.deleteHomeworkForSessionStudent(cleanSessionId, cleanStudentId);

    const currentReport = await this.getSessionReport(cleanSessionId);
    if (!currentReport) return;

    const records = Array.isArray(currentReport.records) ? [...currentReport.records] : [];
    const idx = records.findIndex((r: any) => String(r.studentId).trim() === cleanStudentId);
    if (idx >= 0) {
      records[idx] = {
        ...records[idx],
        status: null,
        recordingMethod: null,
        recordedAt: null,
        homeworkStatus: 'NOT_SUBMITTED',
        isHomeworkSubmitted: false,
        homeworkScore: null,
        homeworkFeedback: null,
        homeworkCheckedAt: null,
      };
    }

    const sessionDateStr = currentReport.sessionDate || currentReport.session?.sessionDate;
    const startTime = currentReport.session?.startTime;
    const endTime = currentReport.session?.endTime;
    const totalEnrolled = Math.max(records.length, currentReport.metrics?.totalEnrolled || 0);
    const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
    const excusedCount = records.filter((r: any) => r.status === 'EXCUSED').length;
    const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;
    const attendanceRatePercentage = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

    const updatedReport = {
      ...currentReport,
      metrics: {
        totalEnrolled,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRatePercentage,
      },
      records,
      stats: {
        totalEnrolled,
        totalPresent: presentCount,
        totalAbsent: absentCount,
      },
    };

    await this.cacheSessionReport(cleanSessionId, updatedReport);

    // Purge any pending un-synced attendance mutations from sync_outbox for this student & session
    const mutations = await this.getPendingMutations();
    for (const m of mutations) {
      const p = m.payload || {};
      const matchSession = String(p.sessionId || '').trim().toLowerCase() === cleanSessionId;
      const matchStudent = String(p.studentId || '').trim().toLowerCase() === String(studentId).trim().toLowerCase();
      const isAttendanceMutation =
        m.type === 'RECORD_ATTENDANCE' ||
        p.type === 'RECORD_ATTENDANCE' ||
        (m.domain === 'attendance' && m.method === 'POST');

      if (matchSession && matchStudent && isAttendanceMutation) {
        await this.removeMutation(m.id);
      }
    }
  }

  // ==========================================
  // Assessment Drafts Operations
  // ==========================================

}
