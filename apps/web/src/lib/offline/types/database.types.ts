import {
  StudentEntity,
  GroupEntity,
  SessionEntity,
  ScheduleEntity,
  BookletEntity,
  PaymentEntity,
  AssessmentEntity,
  CourseEntity,
  HomeworkRecordEntity,
} from './entities.types';
import {
  MutationStatus,
  OutboxMutationRecord,
  OfflineRosterRecord,
  OfflineAssessmentRecord,
  OfflineCredentialsRecord,
  SyncConflictRecord,
} from './mutation.types';
import type { IndexedDbCore } from '../schema/indexeddb-core';

export interface IOfflineDatabase {
  core: IndexedDbCore;
  homework_records: {
    put: (record: HomeworkRecordEntity) => Promise<void>;
    get: (id: string) => Promise<HomeworkRecordEntity | null>;
    getAll: () => Promise<HomeworkRecordEntity[]>;
    delete: (id: string) => Promise<void>;
  };
  sessions_attendance: {
    get: (key: [string, string] | string) => Promise<any | null>;
    put: (record: any) => Promise<void>;
  };
  outbox_mutations: {
    add: (mutation: any) => Promise<string>;
    put: (mutation: any) => Promise<string>;
    get: (id: string) => Promise<OutboxMutationRecord | null>;
    getAll: () => Promise<OutboxMutationRecord[]>;
    toArray: () => Promise<OutboxMutationRecord[]>;
    where: (field: string) => {
      equals: (val: any) => {
        toArray: () => Promise<OutboxMutationRecord[]>;
      };
    };
  };
  isSupported(): boolean;
  getStore(storeName: string, mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; tx: IDBTransaction }>;

  // Metadata & Credentials
  setMetadata(key: string, value: any): Promise<void>;
  getMetadata<T = any>(key: string): Promise<T | null>;
  saveOfflineCredentialsRecord(record: OfflineCredentialsRecord): Promise<void>;
  getOfflineCredentialsRecord(identifier: string): Promise<OfflineCredentialsRecord | null>;
  getAllOfflineCredentialsRecords(): Promise<OfflineCredentialsRecord[]>;
  wipeAllOfflineData(): Promise<void>;
  clearPeriodScopedData(): Promise<void>;
  clearMemoryEntityCaches(): void;
  isUserAuthorizedForOfflineData(): Promise<boolean>;

  // Students & QR
  bulkPutStudents(students: StudentEntity[]): Promise<void>;
  syncStudentsSnapshot(students: StudentEntity[]): Promise<void>;
  putStudent(student: StudentEntity): Promise<void>;
  removeStudent(id: string): Promise<void>;
  getStudentsOffline(options?: {
    search?: string;
    query?: string;
    groupId?: string;
    gradeLevel?: string;
    academicStage?: string;
    academicStatus?: string;
    academicYear?: string;
    academicTerm?: string;
  }): Promise<StudentEntity[]>;
  getStudentByIdOffline(id: string | number): Promise<StudentEntity | null>;
  getStudentDetailsOffline(id: string | number): Promise<StudentEntity | null>;
  findStudentByQrToken(
    qrCodeToken: string,
    preferredGroupId?: string,
  ): Promise<{
    student: any;
    groupId: string;
    groupName: string;
  } | null>;

  // Groups
  putGroup(group: GroupEntity): Promise<void>;
  bulkPutGroups(groups: GroupEntity[]): Promise<void>;
  syncGroupsSnapshot(groups: GroupEntity[]): Promise<void>;
  removeGroup(id: string): Promise<void>;
  getGroupsOffline(options?: string | {
    academicYear?: string;
    academicTerm?: string;
    gradeLevel?: string;
    status?: string;
  }): Promise<GroupEntity[]>;
  getGroupByIdOffline(id: string | number): Promise<GroupEntity | null>;
  getGroupDetailsOffline(id: string): Promise<GroupEntity | null>;

  // Sessions & Schedules
  bulkPutSessions(sessions: SessionEntity[]): Promise<void>;
  syncSessionsSnapshot(
    sessions: SessionEntity[],
    scope?: { academicYear?: string; academicTerm?: string; groupId?: string },
  ): Promise<void>;
  removeSession(id: string): Promise<void>;
  getSessionsOffline(
    filterOrGroupId?:
      | string
      | {
          groupId?: string;
          dateStr?: string;
          academicYear?: string;
          academicTerm?: string;
        },
    dateStr?: string,
  ): Promise<SessionEntity[]>;
  getSessionByIdOffline(id: string): Promise<SessionEntity | null>;
  bulkPutSchedules(schedules: ScheduleEntity[]): Promise<void>;
  getSchedulesOffline(groupId?: string): Promise<ScheduleEntity[]>;

  // Payments
  bulkPutPayments(payments: PaymentEntity[]): Promise<void>;
  putPayment(payment: PaymentEntity): Promise<void>;
  removePayment(id: string): Promise<void>;
  deletePaymentLocally(paymentId: string): Promise<PaymentEntity | null>;
  getPaymentByIdOffline(id: string): Promise<PaymentEntity | null>;
  getPaymentsOffline(filter?: {
    studentId?: string;
    groupId?: string;
    year?: number;
    month?: number;
    periodYear?: number;
    periodMonth?: number;
  }): Promise<PaymentEntity[]>;
  removePaymentRecordFromStudent(studentId: string, paymentId: string): Promise<void>;
  isPaymentRecordedOffline(
    studentId: string,
    groupId: string | null | undefined,
    year: number,
    month: number,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }>;
  markStudentPaidOffline(studentId: string, payment: PaymentEntity): Promise<void>;

  // Booklets
  bulkPutBooklets(booklets: BookletEntity[]): Promise<void>;
  putBooklet(booklet: BookletEntity): Promise<void>;
  removeBooklet(id: string): Promise<void>;
  getBookletsOffline(
    gradeLevelOrFilter?: string | { gradeLevel?: string; groupId?: string; groupIds?: string[]; isActive?: boolean },
    groupIdsArg?: string[],
  ): Promise<BookletEntity[]>;
  getBookletByIdOffline(id: string): Promise<BookletEntity | null>;
  isBookletPaymentRecordedOffline(
    studentId: string,
    bookletId: string,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }>;
  recordBookletPaymentOffline(params: {
    studentId: string;
    bookletId: string;
    amountPaid: number;
    amountExpected?: number;
    groupId?: string;
    notes?: string;
    receiptNumber?: string;
    paymentMethod?: string;
  }): Promise<PaymentEntity>;
  revertBookletPaymentEffectsOffline(bookletId: string, amountPaid: number): Promise<void>;

  // Attendance
  cacheRoster(roster: OfflineRosterRecord): Promise<void>;
  getRoster(groupId: string): Promise<OfflineRosterRecord | null>;
  getAllCachedRosters(): Promise<OfflineRosterRecord[]>;
  clearRosters(): Promise<void>;
  cacheSessionReport(sessionId: string, report: any): Promise<void>;
  getSessionReport(sessionId: string): Promise<any | null>;
  revertAttendanceRecordOffline(sessionId: string, studentId: string): Promise<void>;
  getSessionAttendanceRecord(sessionId: string, studentId: string): Promise<any | null>;
  isAttendanceRecordedOffline(sessionId: string, studentId: string): Promise<boolean>;
  recordAttendanceOffline(
    sessionId: string,
    record: {
      studentId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      recordingMethod?: 'MANUAL' | 'QR_SCAN' | 'BARCODE';
      recordedAt?: string;
      studentName?: string;
      studentCode?: string;
    },
  ): Promise<any>;

  // Homework
  putHomeworkRecord(record: HomeworkRecordEntity): Promise<void>;
  getHomeworkRecordById(id: string): Promise<HomeworkRecordEntity | null>;
  getAllHomeworkRecords(): Promise<HomeworkRecordEntity[]>;
  deleteHomeworkRecord(id: string): Promise<void>;
  deleteHomeworkForSessionStudent(sessionId: string, studentId: string): Promise<void>;
  getHomeworkRecordsForSession(sessionId: string, assessmentId?: string): Promise<HomeworkRecordEntity[]>;
  recordHomeworkOnsiteOffline(data: {
    sessionId: string;
    studentId: string;
    score: number;
    maxScore: number;
    assessmentId?: string;
    notes?: string;
    recordedMethod?: 'QR_SCAN' | 'MANUAL';
    studentName?: string;
    studentCode?: string;
  }): Promise<{ homeworkRecord: HomeworkRecordEntity; attendanceRecord?: any }>;

  // Assessments & Courses
  bulkPutAssessments(assessments: AssessmentEntity[]): Promise<void>;
  removeAssessment(id: string): Promise<void>;
  getAssessmentsOffline(isPublished?: boolean): Promise<AssessmentEntity[]>;
  getAssessmentByIdOffline(id: string): Promise<AssessmentEntity | null>;
  saveAssessmentDraft(draft: OfflineAssessmentRecord): Promise<void>;
  getAssessmentDraft(assessmentId: string): Promise<OfflineAssessmentRecord | null>;
  bulkPutCourses(courses: CourseEntity[]): Promise<void>;
  getCoursesOffline(isPublished?: boolean): Promise<CourseEntity[]>;
  getCourseByIdOffline(id: string): Promise<CourseEntity | null>;

  // Outbox Mutations & Conflicts
  getPendingEntityIds(): Promise<Set<string>>;
  enqueueMutation(mutation: OutboxMutationRecord): Promise<void>;
  getPendingMutations(userId?: string): Promise<OutboxMutationRecord[]>;
  recoverOrphanedSyncingMutations(userId?: string): Promise<void>;
  claimUnassociatedMutations(userId: string): Promise<number>;
  updateMutationStatus(id: string, status: MutationStatus, error?: string): Promise<void>;
  resetMutationForRetry(id: string): Promise<void>;
  removeMutation(id: string): Promise<void>;
  getPendingCount(): Promise<number>;
  getUserPendingCount(userId: string): Promise<number>;
  clearUserPendingMutations(userId: string): Promise<number>;
  recordConflict(conflict: SyncConflictRecord): Promise<void>;
  getConflicts(): Promise<SyncConflictRecord[]>;
  getUnresolvedConflicts(): Promise<SyncConflictRecord[]>;
  resolveConflict(id: string, note?: string): Promise<void>;
  reconcileEntityIds(mappings?: {
    groups?: Record<string, string>;
    students?: Record<string, { id: string; studentCode?: string; qrCodeToken?: string }>;
    payments?: Record<string, string>;
  }): Promise<void>;
}
