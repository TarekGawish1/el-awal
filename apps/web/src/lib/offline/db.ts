/**
 * Typed Relational IndexedDB Database Facade for El Awal Platform
 * High-performance, modular facade with backward compatibility.
 */

import {
  StudentEntity,
  GroupEntity,
  SessionEntity,
  ScheduleEntity,
  BookletEntity,
  PaymentEntity,
  AssessmentEntity,
  CourseEntity,
  MutationStatus,
  OutboxMutationRecord,
  OfflineRosterRecord,
  OfflineAssessmentRecord,
  SyncConflictRecord,
  HomeworkRecordEntity,
  IOfflineDatabase,
} from './types';
import { IndexedDbCore } from './schema/indexeddb-core';
import {
  StudentsRepository,
  StudentsQrRepository,
  GroupsRepository,
  SessionsSchedulesRepository,
  PaymentsRepository,
  BookletsRepository,
  RostersReportsRepository,
  AttendanceRepository,
  HomeworkRepository,
  AssessmentsCoursesRepository,
  OutboxRepository,
  ConflictsReconciliationRepository,
} from './repositories';

export * from './types';

class OfflineDatabase implements IOfflineDatabase {
  public core = new IndexedDbCore();

  private studentsRepo: StudentsRepository = new StudentsRepository(this);
  private studentsQrRepo: StudentsQrRepository = new StudentsQrRepository(this);
  private groupsRepo: GroupsRepository = new GroupsRepository(this);
  private sessionsSchedulesRepo: SessionsSchedulesRepository = new SessionsSchedulesRepository(this);
  private paymentsRepo: PaymentsRepository = new PaymentsRepository(this);
  private bookletsRepo: BookletsRepository = new BookletsRepository(this);
  private rostersReportsRepo: RostersReportsRepository = new RostersReportsRepository(this);
  private attendanceRepo: AttendanceRepository = new AttendanceRepository(this);
  private homeworkRepo: HomeworkRepository = new HomeworkRepository(this);
  private assessmentsCoursesRepo: AssessmentsCoursesRepository = new AssessmentsCoursesRepository(this);
  private outboxRepo: OutboxRepository = new OutboxRepository(this);
  private conflictsReconRepo: ConflictsReconciliationRepository = new ConflictsReconciliationRepository(this);

  // In-memory fallbacks accessors for Vitest/SSR/Node
  public get memoryStudents() { return this.core.memoryStudents; }
  public get memoryGroups() { return this.core.memoryGroups; }
  public get memorySessions() { return this.core.memorySessions; }
  public get memorySchedules() { return this.core.memorySchedules; }
  public get memoryPayments() { return this.core.memoryPayments; }
  public get memoryAssessments() { return this.core.memoryAssessments; }
  public get memoryCourses() { return this.core.memoryCourses; }
  public get memoryMetadata() { return this.core.memoryMetadata; }
  public get memoryOutbox() { return this.core.memoryOutbox; }
  public get memoryRosters() { return this.core.memoryRosters; }
  public get memoryDrafts() { return this.core.memoryDrafts; }
  public get memoryConflicts() { return this.core.memoryConflicts; }
  public get memoryCredentials() { return this.core.memoryCredentials; }
  public get memoryReports() { return this.core.memoryReports; }
  public get memoryBooklets() { return this.core.memoryBooklets; }
  public get memoryHomeworkRecords() { return this.core.memoryHomeworkRecords; }

  // Core Connection & Utilities
  public isSupported() { return this.core.isSupported(); }
  public open() { return this.core.open(); }
  public getStore(storeName: string, mode: IDBTransactionMode) { return this.core.getStore(storeName, mode); }
  public setMetadata(key: string, value: any) { return this.core.setMetadata(key, value); }
  public getMetadata<T = any>(key: string) { return this.core.getMetadata<T>(key); }
  public saveOfflineCredentialsRecord(record: any) { return this.core.saveOfflineCredentialsRecord(record); }
  public getOfflineCredentialsRecord(id: string) { return this.core.getOfflineCredentialsRecord(id); }
  public getAllOfflineCredentialsRecords() { return this.core.getAllOfflineCredentialsRecords(); }
  public wipeAllOfflineData() { return this.core.wipeAllOfflineData(); }
  public clearPeriodScopedData() { return this.core.clearPeriodScopedData(); }
  public clearMemoryEntityCaches() { return this.core.clearMemoryEntityCaches(); }

  public async isUserAuthorizedForOfflineData(): Promise<boolean> {
    const lastBootstrapUserId = await this.getMetadata<string>('lastBootstrapUserId');
    if (!lastBootstrapUserId) {
      return true;
    }
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) {
      return false;
    }
    return currentUserId === lastBootstrapUserId;
  }

  // Store Proxies for Vitest / Direct Dexie-like API Mocking
  public homework_records = {
    put: async (record: HomeworkRecordEntity): Promise<void> => this.putHomeworkRecord(record),
    get: async (id: string): Promise<HomeworkRecordEntity | null> => this.getHomeworkRecordById(id),
    getAll: async (): Promise<HomeworkRecordEntity[]> => this.getAllHomeworkRecords(),
    delete: async (id: string): Promise<void> => this.deleteHomeworkRecord(id),
  };

  public sessions_attendance = {
    get: async (key: [string, string] | string): Promise<any | null> => {
      const [sessionId, studentId] = Array.isArray(key) ? key : String(key).split('_');
      return this.getSessionAttendanceRecord(sessionId, studentId);
    },
    put: async (record: any): Promise<void> => {
      const { sessionId, studentId, status, recordingMethod, markedAt, studentName, studentCode } = record;
      await this.recordAttendanceOffline(sessionId, {
        studentId,
        status: status || 'PRESENT',
        recordingMethod: recordingMethod || 'QR_SCAN',
        recordedAt: markedAt ? new Date(markedAt).toISOString() : new Date().toISOString(),
        studentName,
        studentCode,
      });
    },
  };

  public outbox_mutations = {
    add: async (mutation: any): Promise<string> => {
      const fullMutation: OutboxMutationRecord = {
        id: mutation.id || crypto.randomUUID(),
        type: mutation.type || mutation.payload?.type || undefined,
        domain: mutation.domain || (mutation.type?.includes('HOMEWORK') ? 'attendance' : 'attendance'),
        endpoint: mutation.endpoint || (mutation.type?.includes('HOMEWORK') ? '/sync/homework' : '/sync/attendance'),
        method: mutation.method || 'POST',
        payload: mutation.payload || mutation,
        clientTimestamp: mutation.clientTimestamp || Date.now(),
        retryCount: 0,
        status: mutation.status || 'PENDING',
        conflictStrategy: mutation.conflictStrategy || 'CLIENT_WINS',
      };
      await this.enqueueMutation(fullMutation);
      return fullMutation.id;
    },
    put: async (mutation: any): Promise<string> => this.outbox_mutations.add(mutation),
    get: async (id: string): Promise<OutboxMutationRecord | null> => {
      const mutations = await this.getPendingMutations();
      return mutations.find((m) => m.id === id) || null;
    },
    getAll: async (): Promise<OutboxMutationRecord[]> => this.getPendingMutations(),
    toArray: async (): Promise<OutboxMutationRecord[]> => this.getPendingMutations(),
    where: (field: string) => ({
      equals: (val: any) => ({
        toArray: async (): Promise<OutboxMutationRecord[]> => {
          const all = await this.getPendingMutations();
          return all.filter((m: any) => m[field] === val);
        },
      }),
    }),
  };

  // Delegated Repository Operations
  public bulkPutStudents(students: StudentEntity[]): Promise<void> { return this.studentsRepo.bulkPutStudents(students); }
  public syncStudentsSnapshot(students: StudentEntity[]): Promise<void> { return this.studentsRepo.syncStudentsSnapshot(students); }
  public putStudent(student: StudentEntity): Promise<void> { return this.studentsRepo.putStudent(student); }
  public removeStudent(id: string): Promise<void> { return this.studentsRepo.removeStudent(id); }
  public getStudentsOffline(options?: any): Promise<StudentEntity[]> { return this.studentsRepo.getStudentsOffline(options); }
  public getStudentByIdOffline(id: string | number): Promise<StudentEntity | null> { return this.studentsRepo.getStudentByIdOffline(id); }
  public getStudentDetailsOffline(id: string | number): Promise<any | null> { return this.studentsRepo.getStudentDetailsOffline(id); }
  public findStudentByQrToken(qr: string, pId?: string): Promise<{ student: any; groupId: string; groupName: string; } | null> { return this.studentsQrRepo.findStudentByQrToken(qr, pId); }

  public putGroup(group: GroupEntity): Promise<void> { return this.groupsRepo.putGroup(group); }
  public bulkPutGroups(groups: GroupEntity[]): Promise<void> { return this.groupsRepo.bulkPutGroups(groups); }
  public syncGroupsSnapshot(groups: GroupEntity[]): Promise<void> { return this.groupsRepo.syncGroupsSnapshot(groups); }
  public removeGroup(id: string): Promise<void> { return this.groupsRepo.removeGroup(id); }
  public getGroupsOffline(options?: string | {
    academicYear?: string;
    academicTerm?: string;
    gradeLevel?: string;
    status?: string;
  }): Promise<GroupEntity[]> {
    return this.groupsRepo.getGroupsOffline(options);
  }
  public getGroupByIdOffline(id: string | number): Promise<GroupEntity | null> { return this.groupsRepo.getGroupByIdOffline(id); }
  public getGroupDetailsOffline(id: string): Promise<any | null> { return this.groupsRepo.getGroupDetailsOffline(id); }

  public bulkPutSessions(sessions: SessionEntity[]): Promise<void> { return this.sessionsSchedulesRepo.bulkPutSessions(sessions); }
  public syncSessionsSnapshot(
    sessions: SessionEntity[],
    scope?: { academicYear?: string; academicTerm?: string; groupId?: string },
  ): Promise<void> {
    return this.sessionsSchedulesRepo.syncSessionsSnapshot(sessions, scope);
  }
  public removeSession(id: string): Promise<void> { return this.sessionsSchedulesRepo.removeSession(id); }
  public getSessionsOffline(filter?: any, dateStr?: string): Promise<SessionEntity[]> { return this.sessionsSchedulesRepo.getSessionsOffline(filter, dateStr); }
  public getSessionByIdOffline(id: string): Promise<SessionEntity | null> { return this.sessionsSchedulesRepo.getSessionByIdOffline(id); }
  public bulkPutSchedules(schedules: ScheduleEntity[]): Promise<void> { return this.sessionsSchedulesRepo.bulkPutSchedules(schedules); }
  public getSchedulesOffline(groupId?: string): Promise<ScheduleEntity[]> { return this.sessionsSchedulesRepo.getSchedulesOffline(groupId); }

  public bulkPutPayments(payments: PaymentEntity[]): Promise<void> { return this.paymentsRepo.bulkPutPayments(payments); }
  public putPayment(payment: PaymentEntity): Promise<void> { return this.paymentsRepo.putPayment(payment); }
  public removePayment(id: string): Promise<void> { return this.paymentsRepo.removePayment(id); }
  public deletePaymentLocally(id: string): Promise<PaymentEntity | null> { return this.paymentsRepo.deletePaymentLocally(id); }
  public getPaymentByIdOffline(id: string): Promise<PaymentEntity | null> { return this.paymentsRepo.getPaymentByIdOffline(id); }
  public getPaymentsOffline(options?: any): Promise<PaymentEntity[]> { return this.paymentsRepo.getPaymentsOffline(options); }
  public removePaymentRecordFromStudent(sId: string, pId: string): Promise<void> { return this.paymentsRepo.removePaymentRecordFromStudent(sId, pId); }
  public isPaymentRecordedOffline(
    sId: string,
    gId: string | null | undefined,
    yr: number,
    m: number,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }> {
    return this.paymentsRepo.isPaymentRecordedOffline(sId, gId, yr, m);
  }
  public markStudentPaidOffline(sId: string, p: PaymentEntity): Promise<void> { return this.paymentsRepo.markStudentPaidOffline(sId, p); }

  public bulkPutBooklets(booklets: BookletEntity[]): Promise<void> { return this.bookletsRepo.bulkPutBooklets(booklets); }
  public putBooklet(booklet: BookletEntity): Promise<void> { return this.bookletsRepo.putBooklet(booklet); }
  public removeBooklet(id: string): Promise<void> { return this.bookletsRepo.removeBooklet(id); }
  public getBookletsOffline(filter?: any, groupIds?: string[]): Promise<BookletEntity[]> { return this.bookletsRepo.getBookletsOffline(filter, groupIds); }
  public getBookletByIdOffline(id: string): Promise<BookletEntity | null> { return this.bookletsRepo.getBookletByIdOffline(id); }
  public isBookletPaymentRecordedOffline(sId: string, bId: string): Promise<{ isRecorded: boolean; existingPayment?: any }> { return this.bookletsRepo.isBookletPaymentRecordedOffline(sId, bId); }
  public recordBookletPaymentOffline(params: any): Promise<PaymentEntity> { return this.bookletsRepo.recordBookletPaymentOffline(params); }
  public revertBookletPaymentEffectsOffline(bId: string, amt: number): Promise<void> { return this.bookletsRepo.revertBookletPaymentEffectsOffline(bId, amt); }

  public cacheRoster(roster: OfflineRosterRecord): Promise<void> { return this.rostersReportsRepo.cacheRoster(roster); }
  public getRoster(groupId: string): Promise<OfflineRosterRecord | null> { return this.rostersReportsRepo.getRoster(groupId); }
  public getAllCachedRosters(): Promise<OfflineRosterRecord[]> { return this.rostersReportsRepo.getAllCachedRosters(); }
  public clearRosters(): Promise<void> { return this.rostersReportsRepo.clearRosters(); }
  public cacheSessionReport(sId: string, rep: any): Promise<void> { return this.rostersReportsRepo.cacheSessionReport(sId, rep); }
  public getSessionReport(sId: string): Promise<any | null> { return this.rostersReportsRepo.getSessionReport(sId); }
  public getSessionAttendanceRecord(sId: string, stuId: string): Promise<any | null> { return this.rostersReportsRepo.getSessionAttendanceRecord(sId, stuId); }

  public isAttendanceRecordedOffline(sId: string, stuId: string, qr?: string): Promise<boolean> { return this.attendanceRepo.isAttendanceRecordedOffline(sId, stuId, qr); }
  public recordAttendanceOffline(sId: string, rec: any): Promise<any> { return this.attendanceRepo.recordAttendanceOffline(sId, rec); }
  public revertAttendanceRecordOffline(sId: string, stuId: string): Promise<void> { return this.attendanceRepo.revertAttendanceRecordOffline(sId, stuId); }

  public putHomeworkRecord(record: HomeworkRecordEntity): Promise<void> { return this.homeworkRepo.putHomeworkRecord(record); }
  public getHomeworkRecordById(id: string): Promise<HomeworkRecordEntity | null> { return this.homeworkRepo.getHomeworkRecordById(id); }
  public getAllHomeworkRecords(): Promise<HomeworkRecordEntity[]> { return this.homeworkRepo.getAllHomeworkRecords(); }
  public deleteHomeworkRecord(id: string): Promise<void> { return this.homeworkRepo.deleteHomeworkRecord(id); }
  public deleteHomeworkForSessionStudent(sId: string, stuId: string): Promise<void> { return this.homeworkRepo.deleteHomeworkForSessionStudent(sId, stuId); }
  public getHomeworkRecordsForSession(sId: string, aId?: string): Promise<HomeworkRecordEntity[]> { return this.homeworkRepo.getHomeworkRecordsForSession(sId, aId); }
  public recordHomeworkOnsiteOffline(data: any): Promise<{ homeworkRecord: HomeworkRecordEntity; attendanceRecord?: any }> { return this.homeworkRepo.recordHomeworkOnsiteOffline(data); }

  public bulkPutAssessments(assessments: AssessmentEntity[]): Promise<void> { return this.assessmentsCoursesRepo.bulkPutAssessments(assessments); }
  public removeAssessment(id: string): Promise<void> { return this.assessmentsCoursesRepo.removeAssessment(id); }
  public getAssessmentsOffline(isPub?: boolean): Promise<AssessmentEntity[]> { return this.assessmentsCoursesRepo.getAssessmentsOffline(isPub); }
  public getAssessmentByIdOffline(id: string): Promise<AssessmentEntity | null> { return this.assessmentsCoursesRepo.getAssessmentByIdOffline(id); }
  public saveAssessmentDraft(draft: OfflineAssessmentRecord): Promise<void> { return this.assessmentsCoursesRepo.saveAssessmentDraft(draft); }
  public getAssessmentDraft(id: string): Promise<OfflineAssessmentRecord | null> { return this.assessmentsCoursesRepo.getAssessmentDraft(id); }
  public bulkPutCourses(courses: CourseEntity[]): Promise<void> { return this.assessmentsCoursesRepo.bulkPutCourses(courses); }
  public getCoursesOffline(isPub?: boolean): Promise<CourseEntity[]> { return this.assessmentsCoursesRepo.getCoursesOffline(isPub); }
  public getCourseByIdOffline(id: string): Promise<CourseEntity | null> { return this.assessmentsCoursesRepo.getCourseByIdOffline(id); }

  public getPendingEntityIds(): Promise<Set<string>> { return this.outboxRepo.getPendingEntityIds(); }
  public enqueueMutation(mutation: OutboxMutationRecord): Promise<void> { return this.outboxRepo.enqueueMutation(mutation); }
  public getPendingMutations(userId?: string): Promise<OutboxMutationRecord[]> { return this.outboxRepo.getPendingMutations(userId); }
  public recoverOrphanedSyncingMutations(userId?: string): Promise<void> { return this.outboxRepo.recoverOrphanedSyncingMutations(userId); }
  public claimUnassociatedMutations(userId: string): Promise<number> { return this.outboxRepo.claimUnassociatedMutations(userId); }
  public updateMutationStatus(id: string, st: MutationStatus, err?: string): Promise<void> { return this.outboxRepo.updateMutationStatus(id, st, err); }
  public resetMutationForRetry(id: string): Promise<void> { return this.outboxRepo.resetMutationForRetry(id); }
  public removeMutation(id: string): Promise<void> { return this.outboxRepo.removeMutation(id); }
  public getPendingCount(): Promise<number> { return this.outboxRepo.getPendingCount(); }
  public getUserPendingCount(userId: string): Promise<number> { return this.outboxRepo.getUserPendingCount(userId); }
  public clearUserPendingMutations(userId: string): Promise<number> { return this.outboxRepo.clearUserPendingMutations(userId); }

  public recordConflict(conflict: SyncConflictRecord): Promise<void> { return this.conflictsReconRepo.recordConflict(conflict); }
  public getConflicts(): Promise<SyncConflictRecord[]> { return this.conflictsReconRepo.getConflicts(); }
  public getUnresolvedConflicts(): Promise<SyncConflictRecord[]> { return this.conflictsReconRepo.getUnresolvedConflicts(); }
  public resolveConflict(id: string, note?: string): Promise<void> { return this.conflictsReconRepo.resolveConflict(id, note); }
  public reconcileEntityIds(mappings?: any): Promise<void> { return this.conflictsReconRepo.reconcileEntityIds(mappings); }
}

export const offlineDb = new OfflineDatabase();

export async function getGroupDetailsOffline(id: string) {
  return offlineDb.getGroupDetailsOffline(id);
}

export async function getStudentDetailsOffline(id: string) {
  return offlineDb.getStudentDetailsOffline(id);
}

export async function wipeAllOfflineData() {
  return offlineDb.wipeAllOfflineData();
}

export async function getBookletsOffline(
  gradeLevelOrFilter?:
    | string
    | {
        gradeLevel?: string;
        groupId?: string;
        groupIds?: string[];
        isActive?: boolean;
      },
  groupIdsArg?: string[],
) {
  return offlineDb.getBookletsOffline(gradeLevelOrFilter, groupIdsArg);
}

export async function getBookletByIdOffline(id: string) {
  return offlineDb.getBookletByIdOffline(id);
}

export async function bulkPutBooklets(booklets: BookletEntity[]) {
  return offlineDb.bulkPutBooklets(booklets);
}

export async function putBooklet(booklet: BookletEntity) {
  return offlineDb.putBooklet(booklet);
}

export async function removeBooklet(id: string) {
  return offlineDb.removeBooklet(id);
}

export async function isBookletPaymentRecordedOffline(studentId: string, bookletId: string) {
  return offlineDb.isBookletPaymentRecordedOffline(studentId, bookletId);
}

export async function recordBookletPaymentOffline(params: {
  studentId: string;
  bookletId: string;
  amountPaid: number;
  amountExpected?: number;
  groupId?: string;
  notes?: string;
  receiptNumber?: string;
  paymentMethod?: string;
}) {
  return offlineDb.recordBookletPaymentOffline(params);
}
