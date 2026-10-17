import { HomeworkRecordEntity, IOfflineDatabase } from '../types';

export class HomeworkRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryHomeworkRecords() {
    return this.db.core.memoryHomeworkRecords;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getSessionReport(sessionId: string) {
    return this.db.getSessionReport(sessionId);
  }
  private cacheSessionReport(sessionId: string, report: any) {
    return this.db.cacheSessionReport(sessionId, report);
  }
  private getPendingMutations() {
    return this.db.getPendingMutations();
  }
  private removeMutation(id: string) {
    return this.db.removeMutation(id);
  }
  private findStudentByQrToken(qrCodeToken: string, preferredGroupId?: string) {
    return this.db.findStudentByQrToken(qrCodeToken, preferredGroupId);
  }
  private enqueueMutation(mutation: any) {
    return this.db.enqueueMutation(mutation);
  }
  private recordAttendanceOffline(sessionId: string, record: any) {
    return this.db.recordAttendanceOffline(sessionId, record);
  }


  public async putHomeworkRecord(record: HomeworkRecordEntity): Promise<void> {
    this.memoryHomeworkRecords.set(record.id, { ...record });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('homework_records', 'readwrite');
      return new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  }


  public async getHomeworkRecordById(id: string): Promise<HomeworkRecordEntity | null> {
    if (!this.isSupported()) {
      return this.memoryHomeworkRecords.get(id) || null;
    }
    try {
      const { store } = await this.getStore('homework_records', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || this.memoryHomeworkRecords.get(id) || null);
        req.onerror = () => resolve(this.memoryHomeworkRecords.get(id) || null);
      });
    } catch {
      return this.memoryHomeworkRecords.get(id) || null;
    }
  }


  public async getAllHomeworkRecords(): Promise<HomeworkRecordEntity[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryHomeworkRecords.values());
    }
    try {
      const { store } = await this.getStore('homework_records', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryHomeworkRecords.values()));
        req.onerror = () => resolve(Array.from(this.memoryHomeworkRecords.values()));
      });
    } catch {
      return Array.from(this.memoryHomeworkRecords.values());
    }
  }


  public async deleteHomeworkRecord(id: string): Promise<void> {
    this.memoryHomeworkRecords.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('homework_records', 'readwrite');
      store.delete(id);
    } catch {}
  }


  public async deleteHomeworkForSessionStudent(sessionId: string, studentId: string): Promise<void> {
    const cleanSessionId = String(sessionId).trim().toLowerCase();
    const cleanStudentId = String(studentId).trim();

    // 1. Delete from memory and IndexedDB homework_records
    const allHw = await this.getAllHomeworkRecords();
    const toDelete = allHw.filter(
      (h) =>
        String(h.sessionId).trim().toLowerCase() === cleanSessionId &&
        String(h.studentId).trim().toLowerCase() === cleanStudentId.toLowerCase(),
    );
    for (const hw of toDelete) {
      await this.deleteHomeworkRecord(hw.id);
    }

    // 2. Clear from cached session report if present
    const cachedReport = await this.getSessionReport(cleanSessionId);
    if (cachedReport) {
      let changed = false;
      if (Array.isArray(cachedReport.homeworkRecords)) {
        const origLen = cachedReport.homeworkRecords.length;
        cachedReport.homeworkRecords = cachedReport.homeworkRecords.filter(
          (hr: any) => String(hr.studentId).trim().toLowerCase() !== cleanStudentId.toLowerCase(),
        );
        if (cachedReport.homeworkRecords.length !== origLen) changed = true;
      }
      if (Array.isArray(cachedReport.records)) {
        cachedReport.records = cachedReport.records.map((r: any) => {
          if (String(r.studentId).trim().toLowerCase() === cleanStudentId.toLowerCase()) {
            changed = true;
            return {
              ...r,
              homeworkStatus: 'NOT_SUBMITTED',
              isHomeworkSubmitted: false,
              homeworkScore: null,
              homeworkFeedback: null,
              homeworkCheckedAt: null,
            };
          }
          return r;
        });
      }
      if (changed) {
        await this.cacheSessionReport(cleanSessionId, cachedReport);
      }
    }

    // 3. Purge any pending un-synced homework mutations from sync_outbox for this student & session
    const mutations = await this.getPendingMutations();
    for (const m of mutations) {
      const p = m.payload || {};
      const matchSession = String(p.sessionId || '').trim().toLowerCase() === cleanSessionId;
      const matchStudent = String(p.studentId || '').trim().toLowerCase() === cleanStudentId.toLowerCase();
      const isHomeworkMutation =
        m.type === 'RECORD_HOMEWORK_ONSITE' ||
        m.endpoint?.includes('homework') ||
        p.assessmentId !== undefined;

      if (matchSession && matchStudent && isHomeworkMutation) {
        await this.removeMutation(m.id);
      }
    }
  }


  public async getHomeworkRecordsForSession(sessionId: string, assessmentId?: string): Promise<HomeworkRecordEntity[]> {
    const all = await this.getAllHomeworkRecords();
    return all.filter((r) => {
      const matchSession = String(r.sessionId).trim().toLowerCase() === String(sessionId).trim().toLowerCase();
      if (!matchSession) return false;
      if (assessmentId) {
        return String(r.assessmentId).trim().toLowerCase() === String(assessmentId).trim().toLowerCase();
      }
      return true;
    });
  }


  public async recordHomeworkOnsiteOffline(data: {
    assessmentId: string;
    studentId: string;
    sessionId: string;
    status?: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'SUBMITTED_ONLINE' | 'EXCUSED' | 'INCOMPLETE';
    recordedMethod?: 'QR_SCAN' | 'MANUAL';
    score?: number | null;
    feedback?: string | null;
    studentName?: string;
    studentCode?: string;
    qrCodeToken?: string;
  }): Promise<{ homeworkRecord: HomeworkRecordEntity; attendanceRecord: any }> {
    const status = data.status || 'CHECKED_ONSITE';
    const recordedMethod = data.recordedMethod || 'QR_SCAN';
    const now = Date.now();
    const cleanSessionId = String(data.sessionId).trim();
    let cleanStudentId = String(data.studentId).trim();
    let studentName = data.studentName;
    let studentCode = data.studentCode;
    let qrCodeToken = data.qrCodeToken;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanStudentId);
    if (!isUuid) {
      const match = await this.findStudentByQrToken(qrCodeToken || cleanStudentId);
      if (match?.student) {
        cleanStudentId = match.student.id;
        if (!studentName || studentName === 'طالب غير متزامن') {
          studentName = match.student.fullName || match.student.user?.fullName || studentName;
        }
        if (!studentCode) {
          studentCode = match.student.studentCode || studentCode;
        }
        if (!qrCodeToken) {
          qrCodeToken = match.student.qrCodeToken || qrCodeToken;
        }
      }
    }

    // 1. Check existing homework record for (assessmentId, studentId, sessionId)
    const allHw = await this.getAllHomeworkRecords();
    const existing = allHw.find(
      (h) =>
        h.assessmentId === data.assessmentId &&
        h.studentId === cleanStudentId &&
        h.sessionId === cleanSessionId,
    );

    const hwId = existing?.id || crypto.randomUUID();
    const homeworkRecord: HomeworkRecordEntity = {
      id: hwId,
      assessmentId: data.assessmentId,
      studentId: cleanStudentId,
      sessionId: cleanSessionId,
      status,
      checkedByRole: 'TEACHER',
      recordedMethod,
      score: data.score !== undefined ? data.score : existing?.score || null,
      feedback: data.feedback !== undefined ? data.feedback : existing?.feedback || null,
      clientTimestamp: now,
      syncStatus: 'PENDING',
      studentName,
      studentCode,
    };

    await this.db.homework_records.put(homeworkRecord);

    // 2. Queue homework mutation
    await this.enqueueMutation({
      id: crypto.randomUUID(),
      type: 'RECORD_HOMEWORK_ONSITE',
      domain: 'attendance',
      endpoint: '/sync/homework',
      method: 'POST',
      payload: {
        assessmentId: data.assessmentId,
        studentId: cleanStudentId,
        qrCodeToken,
        sessionId: cleanSessionId,
        status,
        recordedMethod,
        score: homeworkRecord.score,
        feedback: homeworkRecord.feedback,
        clientTimestamp: now,
      },
      status: 'PENDING',
      clientTimestamp: now,
      retryCount: 0,
      conflictStrategy: 'CLIENT_WINS',
    });

    // 3. AUTOMATIC ATTENDANCE TRIGGER
    const existingAttendance = await this.db.sessions_attendance.get([cleanSessionId, cleanStudentId]);
    let attendanceRecord = existingAttendance;

    if (!existingAttendance || existingAttendance.status !== 'PRESENT') {
      const updatedReport = await this.recordAttendanceOffline(cleanSessionId, {
        studentId: cleanStudentId,
        status: 'PRESENT',
        recordingMethod: recordedMethod,
        recordedAt: new Date(now).toISOString(),
        studentName,
        studentCode,
      });

      attendanceRecord = updatedReport?.records?.find(
        (r: any) => String(r.studentId).trim() === cleanStudentId,
      ) || {
        sessionId: cleanSessionId,
        studentId: cleanStudentId,
        status: 'PRESENT',
        recordingMethod: recordedMethod,
        markedAt: now,
      };

      // We DO NOT enqueue a separate RECORD_ATTENDANCE mutation here.
      // The backend /sync/homework (and /sync/batch) handles RECORD_HOMEWORK_ONSITE
      // by transactionally upserting both the HomeworkRecord and the AttendanceRecord.
      // Enqueuing a second mutation would break atomicity and cause duplicate logic.
    }

    return { homeworkRecord, attendanceRecord };
  }

}
