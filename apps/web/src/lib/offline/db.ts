/**
 * Typed Relational IndexedDB Database Layer for El Awal Platform
 * Database: el_awal_offline_db
 * Version: 2
 * Stores:
 *   - students: Normalized student entity store
 *   - groups: Academic cohorts and class configurations
 *   - sessions: Pre-generated lesson sessions
 *   - schedules: Recurring weekly timetables
 *   - payments: Tuition records and payment ledger
 *   - assessments: Published quizzes, homework, and exams
 *   - courses: Educational courses and modules metadata
 *   - system_metadata: Client sync timestamps and versions
 *   - outbox_mutations: Persistent FIFO mutation buffer
 *   - cached_queries: Ad-hoc query caches
 *   - offline_roster_cache: Cohort and QR token lookup caches
 *   - offline_assessments: Student exam drafts and local submissions
 *   - sync_conflicts: Unresolved conflict logs
 */

export interface StudentEntity {
  id: string;
  userId?: string;
  fullName: string;
  phone?: string;
  email?: string;
  studentCode: string;
  qrCodeToken: string;
  gradeLevel?: string;
  academicStage?: string;
  emergencyPhone?: string;
  parentPhone?: string;
  academicStatus?: string;
  groupId?: string;
  updatedAt?: number;
  user?: {
    id?: string;
    fullName: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  };
  groupEnrollments?: any[];
  parentLinks?: any[];
}

export interface GroupEntity {
  id: string;
  name: string;
  gradeLevel?: string;
  academicYear?: string;
  academicTerm?: string;
  monthlyFee?: number;
  maxStudents?: number;
  schedules?: any[];
  _count?: { enrollments?: number };
  updatedAt?: number;
}

export interface SessionEntity {
  id: string;
  groupId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  status?: string;
  isCancelled?: boolean;
  group?: {
    id?: string;
    name: string;
    gradeLevel?: string;
    academicYear?: string;
    academicTerm?: string;
  };
  _count?: { attendanceRecords?: number };
}

export interface ScheduleEntity {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
  location?: string;
}

export interface PaymentEntity {
  id: string;
  studentId: string;
  groupId?: string | null;
  periodYear: number;
  periodMonth: number;
  amountPaid: number;
  amountExpected?: number;
  paymentStatus: string;
  paymentMethod: string;
  currency?: string;
  receiptNumber?: string | null;
  notes?: string | null;
  createdAt: string | number;
  student?: { user?: { fullName?: string } };
  group?: { name?: string };
}

export interface AssessmentEntity {
  id: string;
  title: string;
  type?: 'EXAM' | 'ASSIGNMENT' | string;
  description?: string;
  assessmentType?: string;
  totalScore: number;
  passingScore?: number;
  durationMinutes?: number;
  dueDate?: string;
  isPublished: boolean;
  mySubmission?: any;
  questions: Array<{
    id: string;
    questionNumber: number;
    questionText: string;
    questionType: string;
    optionsData?: any;
    imageUrl?: string;
    points: number;
    correctAnswer?: string;
  }>;
  submissions?: any[];
}

export interface CourseEntity {
  id: string;
  title: string;
  description?: string;
  gradeLevel?: string;
  isPublished: boolean;
  lessons?: any[];
}

export type MutationStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';

export interface OutboxMutationRecord {
  id: string;
  domain: 'attendance' | 'finance' | 'progress' | 'assessments' | 'students' | 'groups' | 'generic';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  clientTimestamp: number;
  retryCount: number;
  status: MutationStatus;
  conflictStrategy?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MONOTONIC' | 'MANUAL_REVIEW';
  lastError?: string;
  optimisticId?: string;
}

export interface OfflineRosterRecord {
  groupId: string;
  groupName: string;
  gradeLevel?: string;
  monthlyFee?: number;
  students: Array<{
    id: string;
    fullName: string;
    studentCode?: string;
    qrCodeToken: string;
    gradeLevel?: string;
    emergencyPhone?: string;
    parentPhone?: string;
    academicStatus?: string;
  }>;
  sessions?: any[];
  updatedAt: number;
}

export interface OfflineAssessmentRecord {
  assessmentId: string;
  title: string;
  durationMinutes?: number;
  dueDate?: string;
  totalScore: number;
  questions: any[];
  draftAnswers: Record<string, string>;
  isSubmitted: boolean;
  submittedAt?: number;
  localScore?: number;
  updatedAt: number;
}

export interface SyncConflictRecord {
  id: string;
  operationId: string;
  domain: string;
  reason: string;
  payload: any;
  timestamp: number;
  resolved: boolean;
  resolutionNote?: string;
}

const DB_NAME = 'el_awal_offline_db';
const DB_VERSION = 2;

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  // In-memory relational fallback maps for SSR/Vitest/Node
  private memoryStudents: Map<string, StudentEntity> = new Map();
  private memoryGroups: Map<string, GroupEntity> = new Map();
  private memorySessions: Map<string, SessionEntity> = new Map();
  private memorySchedules: Map<string, ScheduleEntity> = new Map();
  private memoryPayments: Map<string, PaymentEntity> = new Map();
  private memoryAssessments: Map<string, AssessmentEntity> = new Map();
  private memoryCourses: Map<string, CourseEntity> = new Map();
  private memoryMetadata: Map<string, any> = new Map();
  private memoryOutbox: Map<string, OutboxMutationRecord> = new Map();
  private memoryRosters: Map<string, OfflineRosterRecord> = new Map();
  private memoryDrafts: Map<string, OfflineAssessmentRecord> = new Map();
  private memoryConflicts: Map<string, SyncConflictRecord> = new Map();

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && typeof indexedDB?.open === 'function';
  }

  private open(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Relational Entity Stores
          if (!db.objectStoreNames.contains('students')) {
            const store = db.createObjectStore('students', { keyPath: 'id' });
            store.createIndex('idx_qrCodeToken', 'qrCodeToken', { unique: false });
            store.createIndex('idx_studentCode', 'studentCode', { unique: false });
            store.createIndex('idx_fullName', 'fullName', { unique: false });
            store.createIndex('idx_phone', 'phone', { unique: false });
            store.createIndex('idx_gradeLevel', 'gradeLevel', { unique: false });
          }

          if (!db.objectStoreNames.contains('groups')) {
            const store = db.createObjectStore('groups', { keyPath: 'id' });
            store.createIndex('idx_name', 'name', { unique: false });
            store.createIndex('idx_academicYear', 'academicYear', { unique: false });
          }

          if (!db.objectStoreNames.contains('sessions')) {
            const store = db.createObjectStore('sessions', { keyPath: 'id' });
            store.createIndex('idx_groupId', 'groupId', { unique: false });
            store.createIndex('idx_sessionDate', 'sessionDate', { unique: false });
          }

          if (!db.objectStoreNames.contains('schedules')) {
            const store = db.createObjectStore('schedules', { keyPath: 'id' });
            store.createIndex('idx_groupId', 'groupId', { unique: false });
            store.createIndex('idx_dayOfWeek', 'dayOfWeek', { unique: false });
          }

          if (!db.objectStoreNames.contains('payments')) {
            const store = db.createObjectStore('payments', { keyPath: 'id' });
            store.createIndex('idx_studentId', 'studentId', { unique: false });
            store.createIndex('idx_groupId', 'groupId', { unique: false });
            store.createIndex('idx_period', ['periodYear', 'periodMonth'], { unique: false });
          }

          if (!db.objectStoreNames.contains('assessments')) {
            const store = db.createObjectStore('assessments', { keyPath: 'id' });
            store.createIndex('idx_isPublished', 'isPublished', { unique: false });
          }

          if (!db.objectStoreNames.contains('courses')) {
            const store = db.createObjectStore('courses', { keyPath: 'id' });
            store.createIndex('idx_isPublished', 'isPublished', { unique: false });
          }

          if (!db.objectStoreNames.contains('system_metadata')) {
            db.createObjectStore('system_metadata', { keyPath: 'key' });
          }

          // 2. Operational & Outbox Stores
          if (!db.objectStoreNames.contains('cached_queries')) {
            const store = db.createObjectStore('cached_queries', { keyPath: 'cacheKey' });
            store.createIndex('idx_query_user', ['queryKey', 'userId'], { unique: false });
          }

          if (!db.objectStoreNames.contains('outbox_mutations')) {
            const store = db.createObjectStore('outbox_mutations', { keyPath: 'id' });
            store.createIndex('idx_status', 'status', { unique: false });
            store.createIndex('idx_domain_status', ['domain', 'status'], { unique: false });
            store.createIndex('idx_clientTimestamp', 'clientTimestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains('offline_roster_cache')) {
            const store = db.createObjectStore('offline_roster_cache', { keyPath: 'groupId' });
            store.createIndex('idx_gradeLevel', 'gradeLevel', { unique: false });
          }

          if (!db.objectStoreNames.contains('offline_assessments')) {
            const store = db.createObjectStore('offline_assessments', { keyPath: 'assessmentId' });
            store.createIndex('idx_isSubmitted', 'isSubmitted', { unique: false });
          }

          if (!db.objectStoreNames.contains('sync_conflicts')) {
            const store = db.createObjectStore('sync_conflicts', { keyPath: 'id' });
            store.createIndex('idx_timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });

    return this.dbPromise;
  }

  private async getStore(
    storeName: string,
    mode: IDBTransactionMode,
  ): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
    const db = await this.open();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { store, tx };
  }

  // ==========================================
  // Metadata & Sync Version Operations
  // ==========================================

  public async setMetadata(key: string, value: any): Promise<void> {
    this.memoryMetadata.set(key, value);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('system_metadata', 'readwrite');
      store.put({ key, value, updatedAt: Date.now() });
    } catch {
      // memory fallback already updated
    }
  }

  public async getMetadata<T = any>(key: string): Promise<T | null> {
    if (!this.isSupported()) {
      return this.memoryMetadata.get(key) ?? null;
    }
    try {
      const { store } = await this.getStore('system_metadata', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => resolve(this.memoryMetadata.get(key) ?? null);
      });
    } catch {
      return this.memoryMetadata.get(key) ?? null;
    }
  }

  // ==========================================
  // Bulk Relational Ingestion Methods (Zero Cold-Start)
  // ==========================================

  public async bulkPutStudents(students: StudentEntity[]): Promise<void> {
    students.forEach((s) => this.memoryStudents.set(s.id, s));
    if (!this.isSupported() || students.length === 0) return;
    try {
      const { store } = await this.getStore('students', 'readwrite');
      for (const s of students) {
        store.put(s);
      }
    } catch {
      // Memory fallback holds records
    }
  }

  public async bulkPutGroups(groups: GroupEntity[]): Promise<void> {
    groups.forEach((g) => this.memoryGroups.set(g.id, g));
    if (!this.isSupported() || groups.length === 0) return;
    try {
      const { store } = await this.getStore('groups', 'readwrite');
      for (const g of groups) {
        store.put(g);
      }
    } catch {}
  }

  public async bulkPutSessions(sessions: SessionEntity[]): Promise<void> {
    sessions.forEach((s) => this.memorySessions.set(s.id, s));
    if (!this.isSupported() || sessions.length === 0) return;
    try {
      const { store } = await this.getStore('sessions', 'readwrite');
      for (const s of sessions) {
        store.put(s);
      }
    } catch {}
  }

  public async bulkPutSchedules(schedules: ScheduleEntity[]): Promise<void> {
    schedules.forEach((s) => this.memorySchedules.set(s.id, s));
    if (!this.isSupported() || schedules.length === 0) return;
    try {
      const { store } = await this.getStore('schedules', 'readwrite');
      for (const s of schedules) {
        store.put(s);
      }
    } catch {}
  }

  public async bulkPutPayments(payments: PaymentEntity[]): Promise<void> {
    payments.forEach((p) => this.memoryPayments.set(p.id, p));
    if (!this.isSupported() || payments.length === 0) return;
    try {
      const { store } = await this.getStore('payments', 'readwrite');
      for (const p of payments) {
        store.put(p);
      }
    } catch {}
  }

  public async bulkPutAssessments(assessments: AssessmentEntity[]): Promise<void> {
    assessments.forEach((a) => this.memoryAssessments.set(a.id, a));
    if (!this.isSupported() || assessments.length === 0) return;
    try {
      const { store } = await this.getStore('assessments', 'readwrite');
      for (const a of assessments) {
        store.put(a);
      }
    } catch {}
  }

  public async bulkPutCourses(courses: CourseEntity[]): Promise<void> {
    courses.forEach((c) => this.memoryCourses.set(c.id, c));
    if (!this.isSupported() || courses.length === 0) return;
    try {
      const { store } = await this.getStore('courses', 'readwrite');
      for (const c of courses) {
        store.put(c);
      }
    } catch {}
  }

  // ==========================================
  // Offline Query Resolvers (Instant local reads)
  // ==========================================

  public async getStudentsOffline(options?: {
    search?: string;
    groupId?: string;
    gradeLevel?: string;
  }): Promise<StudentEntity[]> {
    let list: StudentEntity[] = [];

    if (!this.isSupported()) {
      list = Array.from(this.memoryStudents.values());
    } else {
      try {
        const { store } = await this.getStore('students', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(Array.from(this.memoryStudents.values()));
        });
      } catch {
        list = Array.from(this.memoryStudents.values());
      }
    }

    if (!options) return list;

    return list.filter((s) => {
      if (options.gradeLevel && s.gradeLevel !== options.gradeLevel) return false;
      if (options.groupId && s.groupId !== options.groupId) return false;
      if (options.search) {
        const q = options.search.toLowerCase().trim();
        const matchesName = s.fullName?.toLowerCase().includes(q);
        const matchesCode = s.studentCode?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q) || s.parentPhone?.includes(q);
        const matchesQr = s.qrCodeToken?.includes(q);
        return matchesName || matchesCode || matchesPhone || matchesQr;
      }
      return true;
    });
  }

  public async getStudentByIdOffline(id: string): Promise<StudentEntity | null> {
    if (!this.isSupported()) {
      return this.memoryStudents.get(id) || null;
    }
    try {
      const { store } = await this.getStore('students', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || this.memoryStudents.get(id) || null);
        req.onerror = () => resolve(this.memoryStudents.get(id) || null);
      });
    } catch {
      return this.memoryStudents.get(id) || null;
    }
  }

  public async getGroupsOffline(): Promise<GroupEntity[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryGroups.values());
    }
    try {
      const { store } = await this.getStore('groups', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryGroups.values()));
        req.onerror = () => resolve(Array.from(this.memoryGroups.values()));
      });
    } catch {
      return Array.from(this.memoryGroups.values());
    }
  }

  public async getGroupByIdOffline(id: string): Promise<GroupEntity | null> {
    if (!this.isSupported()) {
      return this.memoryGroups.get(id) || null;
    }
    try {
      const { store } = await this.getStore('groups', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || this.memoryGroups.get(id) || null);
        req.onerror = () => resolve(this.memoryGroups.get(id) || null);
      });
    } catch {
      return this.memoryGroups.get(id) || null;
    }
  }

  public async getSessionsOffline(groupId?: string, dateStr?: string): Promise<SessionEntity[]> {
    let list: SessionEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memorySessions.values());
    } else {
      try {
        const { store } = await this.getStore('sessions', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memorySessions.values()));
          req.onerror = () => resolve(Array.from(this.memorySessions.values()));
        });
      } catch {
        list = Array.from(this.memorySessions.values());
      }
    }

    return list.filter((s) => {
      if (groupId && s.groupId !== groupId) return false;
      if (dateStr && !s.sessionDate.startsWith(dateStr)) return false;
      return true;
    });
  }

  public async getPaymentsOffline(options?: {
    groupId?: string;
    studentId?: string;
    year?: number;
    month?: number;
  }): Promise<PaymentEntity[]> {
    let list: PaymentEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryPayments.values());
    } else {
      try {
        const { store } = await this.getStore('payments', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryPayments.values()));
          req.onerror = () => resolve(Array.from(this.memoryPayments.values()));
        });
      } catch {
        list = Array.from(this.memoryPayments.values());
      }
    }

    if (!options) return list;

    return list.filter((p) => {
      if (options.groupId && p.groupId !== options.groupId) return false;
      if (options.studentId && p.studentId !== options.studentId) return false;
      if (options.year && p.periodYear !== options.year) return false;
      if (options.month && p.periodMonth !== options.month) return false;
      return true;
    });
  }

  public async getAssessmentsOffline(): Promise<AssessmentEntity[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryAssessments.values());
    }
    try {
      const { store } = await this.getStore('assessments', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryAssessments.values()));
        req.onerror = () => resolve(Array.from(this.memoryAssessments.values()));
      });
    } catch {
      return Array.from(this.memoryAssessments.values());
    }
  }

  public async getCoursesOffline(): Promise<CourseEntity[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryCourses.values());
    }
    try {
      const { store } = await this.getStore('courses', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryCourses.values()));
        req.onerror = () => resolve(Array.from(this.memoryCourses.values()));
      });
    } catch {
      return Array.from(this.memoryCourses.values());
    }
  }

  // ==========================================
  // Outbox Mutations Operations
  // ==========================================

  public async enqueueMutation(mutation: OutboxMutationRecord): Promise<void> {
    this.memoryOutbox.set(mutation.id, { ...mutation });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      store.put(mutation);
    } catch {}
  }

  public async getPendingMutations(): Promise<OutboxMutationRecord[]> {
    if (!this.isSupported()) {
      const all = Array.from(this.memoryOutbox.values());
      return all
        .filter((m) => m.status === 'PENDING' || m.status === 'FAILED')
        .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    }
    try {
      const { store } = await this.getStore('outbox_mutations', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as OutboxMutationRecord[];
          const pending = all
            .filter((m) => m.status === 'PENDING' || m.status === 'FAILED')
            .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
          resolve(pending);
        };
        req.onerror = () => {
          const all = Array.from(this.memoryOutbox.values());
          resolve(all.filter((m) => m.status === 'PENDING' || m.status === 'FAILED'));
        };
      });
    } catch {
      const all = Array.from(this.memoryOutbox.values());
      return all.filter((m) => m.status === 'PENDING' || m.status === 'FAILED');
    }
  }

  public async updateMutationStatus(
    id: string,
    status: MutationStatus,
    error?: string,
  ): Promise<void> {
    const mem = this.memoryOutbox.get(id);
    if (mem) {
      mem.status = status;
      if (error) mem.lastError = error;
      if (status === 'FAILED') mem.retryCount = (mem.retryCount || 0) + 1;
      this.memoryOutbox.set(id, mem);
    }
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as OutboxMutationRecord;
        if (!record) return;
        record.status = status;
        if (error) record.lastError = error;
        if (status === 'FAILED') record.retryCount = (record.retryCount || 0) + 1;
        store.put(record);
      };
    } catch {}
  }

  public async removeMutation(id: string): Promise<void> {
    this.memoryOutbox.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      store.delete(id);
    } catch {}
  }

  public async getPendingCount(): Promise<number> {
    const pending = await this.getPendingMutations();
    return pending.length;
  }

  // ==========================================
  // Offline Roster Operations
  // ==========================================

  public async cacheRoster(roster: OfflineRosterRecord): Promise<void> {
    this.memoryRosters.set(roster.groupId, { ...roster });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readwrite');
      store.put(roster);
    } catch {}
  }

  public async getRoster(groupId: string): Promise<OfflineRosterRecord | null> {
    if (!this.isSupported()) {
      return this.memoryRosters.get(groupId) || null;
    }
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(groupId);
        req.onsuccess = () => resolve(req.result || this.memoryRosters.get(groupId) || null);
        req.onerror = () => resolve(this.memoryRosters.get(groupId) || null);
      });
    } catch {
      return this.memoryRosters.get(groupId) || null;
    }
  }

  public async getAllCachedRosters(): Promise<OfflineRosterRecord[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryRosters.values());
    }
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryRosters.values()));
        req.onerror = () => resolve(Array.from(this.memoryRosters.values()));
      });
    } catch {
      return Array.from(this.memoryRosters.values());
    }
  }

  public async findStudentByQrToken(qrCodeToken: string): Promise<{
    student: any;
    groupId: string;
    groupName: string;
  } | null> {
    const cleanToken = qrCodeToken.trim();

    // 1. Direct student store index check
    const student = await this.getStudentByIdOffline(cleanToken);
    if (student) {
      const group = student.groupId ? await this.getGroupByIdOffline(student.groupId) : null;
      return {
        student,
        groupId: student.groupId || group?.id || '',
        groupName: group?.name || 'المجموعة الدراسية',
      };
    }

    const allStudents = await this.getStudentsOffline();
    const foundDirect = allStudents.find(
      (s) => s.qrCodeToken === cleanToken || s.studentCode === cleanToken,
    );
    if (foundDirect) {
      const group = foundDirect.groupId ? await this.getGroupByIdOffline(foundDirect.groupId) : null;
      return {
        student: foundDirect,
        groupId: foundDirect.groupId || group?.id || '',
        groupName: group?.name || 'المجموعة الدراسية',
      };
    }

    // 2. Offline roster cache fallback
    const rosters = await this.getAllCachedRosters();
    for (const roster of rosters) {
      const found = roster.students.find(
        (s) => s.qrCodeToken === cleanToken || s.id === cleanToken || s.studentCode === cleanToken,
      );
      if (found) {
        return { student: found, groupId: roster.groupId, groupName: roster.groupName };
      }
    }
    return null;
  }

  // ==========================================
  // Assessment Drafts Operations
  // ==========================================

  public async saveAssessmentDraft(draft: OfflineAssessmentRecord): Promise<void> {
    this.memoryDrafts.set(draft.assessmentId, { ...draft });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_assessments', 'readwrite');
      store.put(draft);
    } catch {}
  }

  public async getAssessmentDraft(assessmentId: string): Promise<OfflineAssessmentRecord | null> {
    if (!this.isSupported()) {
      return this.memoryDrafts.get(assessmentId) || null;
    }
    try {
      const { store } = await this.getStore('offline_assessments', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(assessmentId);
        req.onsuccess = () => resolve(req.result || this.memoryDrafts.get(assessmentId) || null);
        req.onerror = () => resolve(this.memoryDrafts.get(assessmentId) || null);
      });
    } catch {
      return this.memoryDrafts.get(assessmentId) || null;
    }
  }

  // ==========================================
  // Sync Conflicts Operations
  // ==========================================

  public async recordConflict(conflict: SyncConflictRecord): Promise<void> {
    this.memoryConflicts.set(conflict.id, { ...conflict });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('sync_conflicts', 'readwrite');
      store.put(conflict);
    } catch {}
  }

  public async getUnresolvedConflicts(): Promise<SyncConflictRecord[]> {
    if (!this.isSupported()) {
      const list = Array.from(this.memoryConflicts.values());
      return list.filter((c) => !c.resolved).sort((a, b) => b.timestamp - a.timestamp);
    }
    try {
      const { store } = await this.getStore('sync_conflicts', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as SyncConflictRecord[];
          resolve(list.filter((c) => !c.resolved).sort((a, b) => b.timestamp - a.timestamp));
        };
        req.onerror = () => {
          const list = Array.from(this.memoryConflicts.values());
          resolve(list.filter((c) => !c.resolved).sort((a, b) => b.timestamp - a.timestamp));
        };
      });
    } catch {
      const list = Array.from(this.memoryConflicts.values());
      return list.filter((c) => !c.resolved).sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  public async resolveConflict(id: string, note?: string): Promise<void> {
    const item = this.memoryConflicts.get(id);
    if (item) {
      item.resolved = true;
      if (note) item.resolutionNote = note;
      this.memoryConflicts.set(id, item);
    }
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('sync_conflicts', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as SyncConflictRecord;
        if (!record) return;
        record.resolved = true;
        if (note) record.resolutionNote = note;
        store.put(record);
      };
    } catch {}
  }
}

export const offlineDb = new OfflineDatabase();
