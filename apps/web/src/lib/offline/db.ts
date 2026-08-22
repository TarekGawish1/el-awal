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
  isActive?: boolean;
  isArchived?: boolean;
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
  attendanceRecords?: any[];
  paymentRecords?: any[];
}

export interface GroupEntity {
  id: string;
  name: string;
  gradeLevel?: string;
  academicYear?: string;
  academicTerm?: string;
  monthlyFee?: number;
  maxCapacity?: number;
  maxStudents?: number;
  status?: string;
  description?: string;
  schedules?: any[];
  _count?: { enrollments?: number; schedules?: number };
  updatedAt?: number;
}

export interface SessionEntity {
  id: string;
  groupId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
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

export interface BookletEntity {
  id: string;
  title: string;
  price: number;
  gradeLevel: string;
  groupId?: string | null;
  teacherProfileId?: string;
  academicYear?: string;
  academicTerm?: string;
  stockCount?: number | null;
  isActive: boolean;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  salesCount?: number;
  totalRevenue?: number;
  group?: { id: string; name: string; gradeLevel?: string } | null;
}

export interface PaymentEntity {
  id: string;
  studentId: string;
  groupId?: string | null;
  periodYear: number;
  periodMonth: number;
  amountPaid: number;
  amountExpected?: number;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER' | string;
  bookletId?: string | null;
  booklet?: { id: string; title: string; price?: number } | null;
  paymentStatus: string;
  paymentMethod: string;
  currency?: string;
  receiptNumber?: string | null;
  notes?: string | null;
  recordedById?: string | null;
  createdAt: string | number;
  updatedAt?: string | number;
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

export interface OfflineCredentialsRecord {
  identifier: string; // Canonical identifier (lowercased email/phone)
  salt: string;
  hash: string;
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;
    expiresIn?: number;
  };
  cachedAt: number;
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
const DB_VERSION = 3;

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
  private memoryCredentials: Map<string, OfflineCredentialsRecord> = new Map();
  private memoryReports: Map<string, any> = new Map();
  private memoryBooklets: Map<string, BookletEntity> = new Map();

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

          if (!db.objectStoreNames.contains('booklets')) {
            const store = db.createObjectStore('booklets', { keyPath: 'id' });
            store.createIndex('idx_gradeLevel', 'gradeLevel', { unique: false });
            store.createIndex('idx_groupId', 'groupId', { unique: false });
            store.createIndex('idx_isActive', 'isActive', { unique: false });
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

          if (!db.objectStoreNames.contains('offline_credentials')) {
            const store = db.createObjectStore('offline_credentials', { keyPath: 'identifier' });
            store.createIndex('idx_user_email', 'user.email', { unique: false });
            store.createIndex('idx_user_phone', 'user.phone', { unique: false });
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
  // Offline Credentials Operations
  // ==========================================

  public async saveOfflineCredentialsRecord(record: OfflineCredentialsRecord): Promise<void> {
    this.memoryCredentials.set(record.identifier, record);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_credentials', 'readwrite');
      store.put(record);
    } catch {}
  }

  public async getOfflineCredentialsRecord(identifier: string): Promise<OfflineCredentialsRecord | null> {
    if (!this.isSupported()) {
      return this.memoryCredentials.get(identifier) || null;
    }
    try {
      const { store } = await this.getStore('offline_credentials', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(identifier);
        req.onsuccess = () => resolve(req.result || this.memoryCredentials.get(identifier) || null);
        req.onerror = () => resolve(this.memoryCredentials.get(identifier) || null);
      });
    } catch {
      return this.memoryCredentials.get(identifier) || null;
    }
  }

  public async getAllOfflineCredentialsRecords(): Promise<OfflineCredentialsRecord[]> {
    if (!this.isSupported()) {
      return Array.from(this.memoryCredentials.values());
    }
    try {
      const { store } = await this.getStore('offline_credentials', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryCredentials.values()));
        req.onerror = () => resolve(Array.from(this.memoryCredentials.values()));
      });
    } catch {
      return Array.from(this.memoryCredentials.values());
    }
  }

  // ==========================================
  // Bulk Relational Ingestion Methods (Zero Cold-Start)
  // ==========================================

  public async bulkPutStudents(students: StudentEntity[]): Promise<void> {
    students.forEach((s) => {
      const existing = this.memoryStudents.get(s.id) || {};
      this.memoryStudents.set(s.id, { ...existing, ...s, updatedAt: Date.now() });
    });
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

  /**
   * Reconciles local IndexedDB students store with the server snapshot.
   * Inserts/updates server records and prunes any stale orphaned local records
   * that do not exist on the server and are NOT pending upload in outbox_mutations.
   */
  public async syncStudentsSnapshot(serverStudents: StudentEntity[]): Promise<void> {
    // 1. Collect IDs of any local student creations currently pending in outbox
    const pendingMutations = await this.getPendingMutations();
    const pendingStudentIds = new Set<string>();
    for (const m of pendingMutations) {
      if (m.domain === 'students' && m.method === 'POST') {
        if (m.optimisticId) pendingStudentIds.add(m.optimisticId);
        if (m.payload?.id) pendingStudentIds.add(m.payload.id);
      }
    }

    const serverStudentIds = new Set(serverStudents.map((s) => s.id));

    // 2. Memory store reconciliation
    const allMemoryIds = Array.from(this.memoryStudents.keys());
    for (const memId of allMemoryIds) {
      if (!serverStudentIds.has(memId) && !pendingStudentIds.has(memId)) {
        this.memoryStudents.delete(memId);
      }
    }
    for (const s of serverStudents) {
      const existing = this.memoryStudents.get(s.id) || {};
      this.memoryStudents.set(s.id, { ...existing, ...s, updatedAt: Date.now() });
    }

    if (!this.isSupported()) return;

    // 3. IndexedDB store reconciliation
    try {
      const { store } = await this.getStore('students', 'readwrite');
      const allLocalStudents: StudentEntity[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      for (const localStudent of allLocalStudents) {
        if (!serverStudentIds.has(localStudent.id) && !pendingStudentIds.has(localStudent.id)) {
          store.delete(localStudent.id);
        }
      }

      for (const s of serverStudents) {
        store.put(s);
      }
    } catch (e) {
      console.warn('Error during syncStudentsSnapshot:', e);
    }
  }

  public async putStudent(student: StudentEntity): Promise<void> {
    const existing = this.memoryStudents.get(student.id) || {};
    this.memoryStudents.set(student.id, { ...existing, ...student, updatedAt: Date.now() });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('students', 'readwrite');
      store.put(student);
    } catch {}
  }

  public async removeStudent(id: string): Promise<void> {
    this.memoryStudents.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('students', 'readwrite');
      store.delete(id);
    } catch {}
  }

  public async putGroup(group: GroupEntity): Promise<void> {
    const existing = this.memoryGroups.get(group.id) || {};
    this.memoryGroups.set(group.id, { ...existing, ...group, updatedAt: Date.now() });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('groups', 'readwrite');
      store.put(group);
    } catch {}
  }

  public async bulkPutGroups(groups: GroupEntity[]): Promise<void> {
    groups.forEach((g) => {
      const existing = this.memoryGroups.get(g.id) || {};
      this.memoryGroups.set(g.id, { ...existing, ...g, updatedAt: Date.now() });
    });
    if (!this.isSupported() || groups.length === 0) return;
    try {
      const { store } = await this.getStore('groups', 'readwrite');
      for (const g of groups) {
        store.put(g);
      }
    } catch {}
  }

  public async removeGroup(id: string): Promise<void> {
    this.memoryGroups.delete(id);
    this.memoryRosters.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('groups', 'readwrite');
      store.delete(id);
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

  public async removeSession(id: string): Promise<void> {
    this.memorySessions.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('sessions', 'readwrite');
      store.delete(id);
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

  public async removeAssessment(id: string): Promise<void> {
    this.memoryAssessments.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('assessments', 'readwrite');
      store.delete(id);
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
    academicStage?: string;
    academicStatus?: string;
    academicYear?: string;
    academicTerm?: string;
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

    const groups = await this.getGroupsOffline();
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    return list.filter((s) => {
      // 1. Exclude soft-deleted / inactive / archived students
      if (s.isArchived === true) return false;
      if (s.user && s.user.isActive === false) return false;
      if (s.isActive === false) return false;

      // 2. Academic Status filter (default to ACTIVE if not explicitly specified)
      const targetStatus = options?.academicStatus || 'ACTIVE';
      const studentStatus = s.academicStatus || 'ACTIVE';
      if (studentStatus !== targetStatus) return false;

      // 3. Grade Level & Academic Stage filter
      if (options?.gradeLevel && s.gradeLevel !== options.gradeLevel) return false;
      if (options?.academicStage && s.academicStage && s.academicStage !== options.academicStage) return false;

      // 4. Group filter
      if (options?.groupId) {
        const studentGroupId = s.groupId || s.groupEnrollments?.[0]?.groupId || s.groupEnrollments?.[0]?.group?.id;
        if (studentGroupId !== options.groupId) return false;
      }

      // 5. Academic Year & Term filter
      if (options?.academicYear || options?.academicTerm) {
        const studentGroupId = s.groupId || s.groupEnrollments?.[0]?.groupId || s.groupEnrollments?.[0]?.group?.id;
        const group = studentGroupId ? groupMap.get(studentGroupId) : null;
        if (group) {
          if (options.academicYear && group.academicYear && group.academicYear !== options.academicYear) return false;
          if (options.academicTerm && group.academicTerm && group.academicTerm !== options.academicTerm) return false;
        }
      }

      // 6. Search query
      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        const matchesName = (s.fullName || s.user?.fullName || '').toLowerCase().includes(q);
        const matchesCode = (s.studentCode || '').toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q) || s.user?.phone?.includes(q) || s.parentPhone?.includes(q);
        const matchesQr = (s.qrCodeToken || '').includes(q);
        return matchesName || matchesCode || matchesPhone || matchesQr;
      }

      return true;
    });
  }

  public async getStudentByIdOffline(id: string | number): Promise<StudentEntity | null> {
    const cleanId = String(id);
    if (!this.isSupported()) {
      const mem = this.memoryStudents.get(cleanId);
      if (mem) return mem;
      for (const roster of Array.from(this.memoryRosters.values())) {
        const found = roster.students.find((s) => String(s.id) === cleanId);
        if (found) {
          return {
            id: String(found.id),
            fullName: found.fullName,
            studentCode: found.studentCode || `STU-${cleanId.slice(0, 6)}`,
            qrCodeToken: found.qrCodeToken || cleanId,
            gradeLevel: found.gradeLevel || roster.gradeLevel,
            groupId: roster.groupId,
            user: {
              id: String(found.id),
              fullName: found.fullName,
              phone: found.emergencyPhone || found.parentPhone || '',
              isActive: true,
            },
          };
        }
      }
      return null;
    }
    try {
      const { store } = await this.getStore('students', 'readonly');
      const student = await new Promise<StudentEntity | null>((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryStudents.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryStudents.get(cleanId) || null);
      });

      if (student) return student;

      const rosters = await this.getAllCachedRosters();
      for (const roster of rosters) {
        const found = roster.students.find((s) => String(s.id) === cleanId);
        if (found) {
          return {
            id: String(found.id),
            fullName: found.fullName,
            studentCode: found.studentCode || `STU-${cleanId.slice(0, 6)}`,
            qrCodeToken: found.qrCodeToken || cleanId,
            gradeLevel: found.gradeLevel || roster.gradeLevel,
            groupId: roster.groupId,
            user: {
              id: String(found.id),
              fullName: found.fullName,
              phone: found.emergencyPhone || found.parentPhone || '',
              isActive: true,
            },
          };
        }
      }

      return null;
    } catch {
      return this.memoryStudents.get(cleanId) || null;
    }
  }

  /**
   * Unified resilient student details getter with relational joins.
   * Guarantees non-crashing fallbacks for missing nested properties.
   */
  public async getStudentDetailsOffline(id: string | number): Promise<any | null> {
    const cleanId = String(id);
    const student = await this.getStudentByIdOffline(cleanId);
    if (!student) {
      return null;
    }

    const group = student.groupId ? await this.getGroupByIdOffline(student.groupId) : null;
    const payments = await this.getPaymentsOffline({ studentId: cleanId });

    return {
      id: student.id,
      studentCode: student.studentCode || `STU-${cleanId.slice(0, 6)}`,
      qrCodeToken: student.qrCodeToken || cleanId,
      gradeLevel: student.gradeLevel || group?.gradeLevel || 'الصف الدراسي',
      academicStage: student.academicStage || '',
      academicStatus: student.academicStatus || 'ACTIVE',
      emergencyPhone: student.emergencyPhone || student.parentPhone || '',
      createdAt: new Date(student.updatedAt || Date.now()).toISOString(),
      updatedAt: new Date(student.updatedAt || Date.now()).toISOString(),
      user: {
        id: student.userId || student.id,
        fullName: student.fullName || student.user?.fullName || 'طالب',
        phone: student.phone || student.user?.phone || '',
        email: student.email || student.user?.email || '',
        isActive: student.user?.isActive ?? true,
      },
      groupEnrollments: student.groupEnrollments && student.groupEnrollments.length > 0
        ? student.groupEnrollments
        : group
          ? [{ group: { id: group.id, name: group.name, gradeLevel: group.gradeLevel || student.gradeLevel || '' } }]
          : [],
      parentLinks: student.parentLinks && student.parentLinks.length > 0
        ? student.parentLinks
        : student.parentPhone
          ? [{ parent: { user: { id: `p-${student.id}`, fullName: 'ولي الأمر', phone: student.parentPhone, isActive: true } } }]
          : [],
      attendanceRecords: student.attendanceRecords || [],
      paymentRecords: payments || [],
    };
  }

  public async getGroupsOffline(options?: {
    academicYear?: string;
    academicTerm?: string;
    gradeLevel?: string;
    status?: string;
  }): Promise<GroupEntity[]> {
    let list: GroupEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryGroups.values());
    } else {
      try {
        const { store } = await this.getStore('groups', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryGroups.values()));
          req.onerror = () => resolve(Array.from(this.memoryGroups.values()));
        });
      } catch {
        list = Array.from(this.memoryGroups.values());
      }
    }

    return list.filter((g) => {
      // 1. Status and active check
      if (g.status && g.status === 'ARCHIVED') return false;
      if ((g as any).isArchived === true) return false;
      if ((g as any).isActive === false) return false;
      if (options?.status && g.status && g.status !== options.status) return false;

      // 2. Grade level
      if (options?.gradeLevel && g.gradeLevel && g.gradeLevel !== options.gradeLevel) return false;

      // 3. Academic Year & Term
      if (options?.academicYear && g.academicYear && g.academicYear !== options.academicYear) return false;
      if (options?.academicTerm && g.academicTerm && g.academicTerm !== options.academicTerm) return false;

      return true;
    });
  }

  /**
   * Reconciles temporary client UUIDs with authoritative server IDs and codes
   * across groups, students, payments, and offline rosters.
   */
  public async reconcileEntityIds(mappings?: {
    groups?: Record<string, string>;
    students?: Record<string, { id: string; studentCode?: string; qrCodeToken?: string }>;
    payments?: Record<string, string>;
  }): Promise<void> {
    if (!mappings) return;

    // 1. Reconcile Groups
    if (mappings.groups && Object.keys(mappings.groups).length > 0) {
      for (const [tempId, serverId] of Object.entries(mappings.groups)) {
        if (tempId === serverId) continue;
        const localGroup = await this.getGroupByIdOffline(tempId);
        if (localGroup) {
          await this.removeGroup(tempId);
          await this.bulkPutGroups([{ ...localGroup, id: serverId }]);
        }
        const memGrp = this.memoryGroups.get(tempId);
        if (memGrp) {
          this.memoryGroups.delete(tempId);
          memGrp.id = serverId;
          this.memoryGroups.set(serverId, memGrp);
        }
        // Also update roster
        const roster = await this.getRoster(tempId);
        if (roster) {
          await this.cacheRoster({
            ...roster,
            groupId: serverId,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // 2. Reconcile Students
    if (mappings.students && Object.keys(mappings.students).length > 0) {
      for (const [tempId, serverData] of Object.entries(mappings.students)) {
        const localStudent = await this.getStudentByIdOffline(tempId);
        if (localStudent) {
          const updated: StudentEntity = {
            ...localStudent,
            id: serverData.id,
            studentCode: serverData.studentCode || localStudent.studentCode,
            qrCodeToken: serverData.qrCodeToken || localStudent.qrCodeToken,
            groupId: mappings.groups?.[localStudent.groupId || ''] || localStudent.groupId,
          };
          if (tempId !== serverData.id) {
            await this.removeStudent(tempId);
          }
          await this.bulkPutStudents([updated]);
        }
        const memStu = this.memoryStudents.get(tempId);
        if (memStu) {
          this.memoryStudents.delete(tempId);
          memStu.id = serverData.id;
          if (serverData.studentCode) memStu.studentCode = serverData.studentCode;
          if (serverData.qrCodeToken) memStu.qrCodeToken = serverData.qrCodeToken;
          this.memoryStudents.set(serverData.id, memStu);
        }
      }
    }

    // 3. Reconcile Payments
    if (mappings.payments && Object.keys(mappings.payments).length > 0) {
      for (const [tempId, serverId] of Object.entries(mappings.payments)) {
        const memPay = this.memoryPayments.get(tempId);
        if (memPay) {
          this.memoryPayments.delete(tempId);
          memPay.id = serverId;
          this.memoryPayments.set(serverId, memPay);
        }
      }

      if (this.isSupported()) {
        try {
          const { store } = await this.getStore('payments', 'readwrite');
          for (const [tempId, serverId] of Object.entries(mappings.payments)) {
            const getReq = store.get(tempId);
            getReq.onsuccess = () => {
              const val = getReq.result;
              if (val) {
                store.delete(tempId);
                val.id = serverId;
                store.put(val);
              }
            };
          }
        } catch (e) {
          console.warn('Failed to reconcile payments in IndexedDB:', e);
        }
      }
    }
  }

  public async getGroupByIdOffline(id: string | number): Promise<GroupEntity | null> {
    const cleanId = String(id);
    if (!this.isSupported()) {
      const mem = this.memoryGroups.get(cleanId);
      if (mem) return mem;
      const roster = this.memoryRosters.get(cleanId);
      if (roster) {
        return {
          id: roster.groupId,
          name: roster.groupName,
          gradeLevel: roster.gradeLevel,
          monthlyFee: roster.monthlyFee,
          status: 'ACTIVE',
          _count: { enrollments: roster.students?.length || 0, schedules: roster.sessions?.length || 0 },
        };
      }
      return null;
    }
    try {
      const { store } = await this.getStore('groups', 'readonly');
      const group = await new Promise<GroupEntity | null>((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryGroups.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryGroups.get(cleanId) || null);
      });

      if (group) return group;

      const roster = await this.getRoster(cleanId);
      if (roster) {
        return {
          id: roster.groupId,
          name: roster.groupName,
          gradeLevel: roster.gradeLevel,
          monthlyFee: roster.monthlyFee,
          status: 'ACTIVE',
          _count: { enrollments: roster.students?.length || 0, schedules: roster.sessions?.length || 0 },
        };
      }

      return null;
    } catch {
      return this.memoryGroups.get(cleanId) || null;
    }
  }

  /**
   * Unified resilient group details getter with joined student rosters.
   * Guarantees complete relational safety offline.
   */
  public async getGroupDetailsOffline(id: string): Promise<any | null> {
    const group = await this.getGroupByIdOffline(id);
    if (!group) return null;

    const [roster, groupStudents, schedules] = await Promise.all([
      this.getRoster(id),
      this.getStudentsOffline({ groupId: id }),
      this.getSchedulesOffline(id),
    ]);

    const enrolledStudents = roster?.students?.length ? roster.students : groupStudents;
    const effectiveSchedules = group.schedules?.length ? group.schedules : schedules;

    return {
      ...group,
      schedules: effectiveSchedules || [],
      _count: {
        enrollments: enrolledStudents.length || group._count?.enrollments || 0,
        schedules: effectiveSchedules.length || 0,
      },
      students: enrolledStudents,
    };
  }

  public async getSchedulesOffline(groupId?: string): Promise<ScheduleEntity[]> {
    let list: ScheduleEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memorySchedules.values());
    } else {
      try {
        const { store } = await this.getStore('schedules', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memorySchedules.values()));
          req.onerror = () => resolve(Array.from(this.memorySchedules.values()));
        });
      } catch {
        list = Array.from(this.memorySchedules.values());
      }
    }

    if (groupId) {
      return list.filter((s) => s.groupId === groupId);
    }
    return list;
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
      if (groupId && groupId !== 'ALL' && s.groupId !== groupId) return false;
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
  // Booklets & Study Notes Operations
  // ==========================================

  public async bulkPutBooklets(booklets: BookletEntity[]): Promise<void> {
    booklets.forEach((b) => {
      const existing = this.memoryBooklets.get(b.id) || {};
      this.memoryBooklets.set(b.id, { ...existing, ...b, updatedAt: Date.now() });
    });
    if (!this.isSupported() || booklets.length === 0) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      for (const b of booklets) {
        store.put(b);
      }
    } catch {}
  }

  public async putBooklet(booklet: BookletEntity): Promise<void> {
    const existing = this.memoryBooklets.get(booklet.id) || {};
    this.memoryBooklets.set(booklet.id, { ...existing, ...booklet, updatedAt: Date.now() });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      store.put(booklet);
    } catch {}
  }

  public async removeBooklet(id: string): Promise<void> {
    this.memoryBooklets.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      store.delete(id);
    } catch {}
  }

  public async putPayment(payment: PaymentEntity): Promise<void> {
    this.memoryPayments.set(payment.id, payment);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('payments', 'readwrite');
      store.put(payment);
    } catch {}
  }

  public async getBookletsOffline(
    gradeLevelOrFilter?:
      | string
      | {
          gradeLevel?: string;
          groupId?: string;
          groupIds?: string[];
          isActive?: boolean;
        },
    groupIdsArg?: string[],
  ): Promise<BookletEntity[]> {
    let list: BookletEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryBooklets.values());
    } else {
      try {
        const { store } = await this.getStore('booklets', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryBooklets.values()));
          req.onerror = () => resolve(Array.from(this.memoryBooklets.values()));
        });
      } catch {
        list = Array.from(this.memoryBooklets.values());
      }
    }

    if (typeof gradeLevelOrFilter === 'string') {
      const grade = gradeLevelOrFilter;
      const groupIds = groupIdsArg || [];
      return list.filter((b) => {
        if (b.isActive === false) return false;
        if (grade && b.gradeLevel && b.gradeLevel !== grade) return false;
        if (b.groupId) {
          if (!groupIds.includes(b.groupId)) return false;
        }
        return true;
      });
    }

    const filter = gradeLevelOrFilter;
    if (!filter) return list;

    return list.filter((b) => {
      if (filter.isActive !== undefined && b.isActive !== filter.isActive) return false;
      if (filter.gradeLevel && b.gradeLevel && b.gradeLevel !== filter.gradeLevel) return false;
      if (filter.groupIds !== undefined) {
        if (b.groupId && !filter.groupIds.includes(b.groupId)) return false;
      } else if (filter.groupId) {
        if (b.groupId !== filter.groupId) return false;
      }
      return true;
    });
  }

  public async getBookletByIdOffline(id: string): Promise<BookletEntity | null> {
    const cleanId = String(id).trim();
    if (!this.isSupported()) {
      return this.memoryBooklets.get(cleanId) || null;
    }
    try {
      const { store } = await this.getStore('booklets', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryBooklets.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryBooklets.get(cleanId) || null);
      });
    } catch {
      return this.memoryBooklets.get(cleanId) || null;
    }
  }

  public async isBookletPaymentRecordedOffline(
    studentId: string,
    bookletId: string,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }> {
    const cleanStudentId = String(studentId).trim();
    const cleanBookletId = String(bookletId).trim();

    // 1. Check local payments store
    const localPayments = await this.getPaymentsOffline({ studentId: cleanStudentId });
    const matchingLocal = localPayments.find(
      (p) =>
        p.paymentType === 'BOOKLET' &&
        p.bookletId === cleanBookletId &&
        (p.paymentStatus === 'PAID' || Number(p.amountPaid) > 0),
    );

    if (matchingLocal) {
      return { isRecorded: true, existingPayment: matchingLocal };
    }

    // 2. Check pending outbox mutations
    const pendingMutations = await this.getPendingMutations();
    const matchingMutation = pendingMutations.find(
      (m) =>
        m.payload &&
        (m.payload.paymentType === 'BOOKLET' || m.payload.bookletId) &&
        m.payload.studentId === cleanStudentId &&
        m.payload.bookletId === cleanBookletId,
    );

    if (matchingMutation) {
      return { isRecorded: true, existingPayment: matchingMutation.payload };
    }

    return { isRecorded: false };
  }

  public async recordBookletPaymentOffline(params: {
    studentId: string;
    bookletId: string;
    amountPaid: number;
    amountExpected?: number;
    groupId?: string;
    notes?: string;
    receiptNumber?: string;
    paymentMethod?: string;
  }): Promise<PaymentEntity> {
    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;
    const paymentId = `pay-bkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const booklet = await this.getBookletByIdOffline(params.bookletId);
    const student = await this.getStudentByIdOffline(params.studentId);

    if (student?.gradeLevel && booklet?.gradeLevel && student.gradeLevel !== booklet.gradeLevel) {
      throw new Error(
        `INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب (${booklet.gradeLevel} != ${student.gradeLevel})`,
      );
    }

    if (booklet?.groupId) {
      const studentGroupId = student?.groupId || (student as any)?.initialGroupId;
      const studentGroupIds = (student as any)?.groupIds || (studentGroupId ? [studentGroupId] : []);
      if (studentGroupIds.length > 0 && !studentGroupIds.includes(booklet.groupId)) {
        throw new Error(
          'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
        );
      }
    }

    const expected = params.amountExpected ?? (booklet ? Number(booklet.price) : params.amountPaid);

    const paymentRecord: PaymentEntity = {
      id: paymentId,
      studentId: params.studentId,
      groupId: params.groupId || booklet?.groupId || null,
      periodYear,
      periodMonth,
      paymentType: 'BOOKLET',
      bookletId: params.bookletId,
      booklet: booklet ? { id: booklet.id, title: booklet.title, price: booklet.price } : null,
      amountPaid: params.amountPaid,
      amountExpected: expected,
      paymentStatus: 'PAID',
      paymentMethod: params.paymentMethod || 'CASH',
      currency: 'EGP',
      receiptNumber: params.receiptNumber || `REC-BKT-${Date.now().toString().slice(-6)}`,
      notes: params.notes || (booklet ? `سداد مذكرة: ${booklet.title}` : 'سداد قيمة مذكرة'),
      recordedById: 'offline-teacher',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 1. Put payment in offline payments store
    await this.putPayment(paymentRecord);

    // 2. Decrement booklet stock locally if tracked
    if (booklet && booklet.stockCount !== null && booklet.stockCount !== undefined && booklet.stockCount > 0) {
      const updatedBooklet = {
        ...booklet,
        stockCount: booklet.stockCount - 1,
        salesCount: (booklet.salesCount || 0) + 1,
        totalRevenue: (booklet.totalRevenue || 0) + params.amountPaid,
      };
      await this.putBooklet(updatedBooklet);
    }

    // 3. Enqueue Outbox Mutation for upstream sync
    await this.enqueueMutation({
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      domain: 'finance',
      endpoint: '/subscriptions/payment',
      method: 'POST',
      payload: {
        studentId: params.studentId,
        groupId: params.groupId || booklet?.groupId || null,
        bookletId: params.bookletId,
        paymentType: 'BOOKLET',
        periodYear,
        periodMonth,
        amountPaid: params.amountPaid,
        amountExpected: expected,
        paymentMethod: params.paymentMethod || 'CASH',
        receiptNumber: paymentRecord.receiptNumber,
        notes: paymentRecord.notes,
        collectedAt: now.toISOString(),
      },
      optimisticId: paymentId,
      status: 'PENDING',
      retryCount: 0,
      clientTimestamp: Date.now(),
    });

    return paymentRecord;
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
      (s) => s.qrCodeToken === cleanToken || s.studentCode === cleanToken || s.id === cleanToken,
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

  /**
   * Idempotency Check: Checks if attendance is already recorded or queued in outbox for (sessionId, studentId/token)
   */
  public async isAttendanceRecordedOffline(
    sessionId: string,
    studentId: string,
    qrCodeToken?: string,
  ): Promise<boolean> {
    const cleanSessionId = String(sessionId).trim();
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
  public async isPaymentRecordedOffline(
    studentId: string,
    groupId: string | null | undefined,
    year: number,
    month: number,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }> {
    const cleanStudentId = String(studentId).trim();
    const cleanGroupId = groupId ? String(groupId).trim() : null;

    // 1. Check local payments store
    const localPayments = await this.getPaymentsOffline({
      studentId: cleanStudentId,
      year,
      month,
    });

    const matchingLocal = localPayments.find((p) => {
      if (cleanGroupId && p.groupId && p.groupId !== cleanGroupId) return false;
      return p.paymentStatus === 'PAID' || Number(p.amountPaid) > 0;
    });

    if (matchingLocal) {
      return { isRecorded: true, existingPayment: matchingLocal };
    }

    // 2. Check pending outbox mutations
    const pending = await this.getPendingMutations();
    const matchingMutation = pending.find((m) => {
      if (m.domain !== 'finance') return false;
      const p = m.payload || {};
      if (String(p.studentId || '').trim() !== cleanStudentId) return false;
      if (Number(p.periodYear) !== Number(year) || Number(p.periodMonth) !== Number(month)) return false;
      if (cleanGroupId && p.groupId && String(p.groupId).trim() !== cleanGroupId) return false;
      return true;
    });

    if (matchingMutation) {
      return { isRecorded: true, existingPayment: matchingMutation.payload };
    }

    return { isRecorded: false };
  }

  /**
   * Optimistically updates student record and roster cache to mark the student as PAID for the current period.
   */
  public async markStudentPaidOffline(
    studentId: string,
    paymentRecord: Partial<PaymentEntity>,
  ): Promise<void> {
    const cleanId = String(studentId).trim();
    const student = this.memoryStudents.get(cleanId);
    if (student) {
      student.academicStatus = 'ACTIVE';
      student.paymentRecords = student.paymentRecords || [];
      student.paymentRecords.push({
        id: paymentRecord.id || `pay-${Date.now()}`,
        periodYear: paymentRecord.periodYear,
        periodMonth: paymentRecord.periodMonth,
        amountPaid: paymentRecord.amountPaid,
        paymentStatus: 'PAID',
        paymentMethod: paymentRecord.paymentMethod || 'CASH',
        createdAt: paymentRecord.createdAt || new Date().toISOString(),
      });
      this.memoryStudents.set(cleanId, { ...student });
    }

    if (!this.isSupported()) return;

    try {
      const { store } = await this.getStore('students', 'readwrite');
      const getReq = store.get(cleanId);
      getReq.onsuccess = () => {
        const s = getReq.result as StudentEntity;
        if (s) {
          s.academicStatus = 'ACTIVE';
          s.paymentRecords = s.paymentRecords || [];
          s.paymentRecords.push({
            id: paymentRecord.id || `pay-${Date.now()}`,
            periodYear: paymentRecord.periodYear,
            periodMonth: paymentRecord.periodMonth,
            amountPaid: paymentRecord.amountPaid,
            paymentStatus: 'PAID',
            paymentMethod: paymentRecord.paymentMethod || 'CASH',
            createdAt: paymentRecord.createdAt || new Date().toISOString(),
          });
          store.put(s);
        }
      };
    } catch (e) {
      console.warn('Failed to markStudentPaidOffline in IndexedDB:', e);
    }
  }

  // ==========================================
  // Session Reports & Attendance Operations
  // ==========================================

  public async cacheSessionReport(sessionId: string, report: any): Promise<void> {
    const cleanId = String(sessionId).trim().toLowerCase();
    this.memoryReports.set(cleanId, { ...report });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('cached_queries', 'readwrite');
      store.put({
        cacheKey: `session_report_${cleanId}`,
        queryKey: `session_report_${cleanId}`,
        data: report,
        updatedAt: Date.now(),
      });
    } catch {}
  }

  public async getSessionReport(sessionId: string): Promise<any | null> {
    const cleanId = String(sessionId).trim().toLowerCase();
    if (!this.isSupported()) {
      return this.memoryReports.get(cleanId) || null;
    }
    try {
      const { store } = await this.getStore('cached_queries', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(`session_report_${cleanId}`);
        req.onsuccess = () => resolve(req.result?.data || this.memoryReports.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryReports.get(cleanId) || null);
      });
    } catch {
      return this.memoryReports.get(cleanId) || null;
    }
  }

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

      currentReport = {
        sessionId,
        sessionDate: session?.sessionDate || new Date().toISOString(),
        topic: session?.topic || 'رصد الحضور',
        groupId: targetGroupId,
        groupName: roster?.groupName || group?.name || session?.group?.name || 'المجموعة الدراسية',
        metrics: {
          totalEnrolled: studentCount,
          presentCount: 0,
          absentCount: studentCount,
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
      };
    }

    const records = Array.isArray(currentReport.records) ? [...currentReport.records] : [];
    const studentIdx = records.findIndex((r: any) => String(r.studentId).trim() === String(record.studentId).trim());

    const updatedRecord = {
      id: `offline-${Date.now()}-${record.studentId}`,
      studentId: record.studentId,
      studentCode: record.studentCode || records[studentIdx]?.studentCode || '',
      fullName: record.studentName || records[studentIdx]?.fullName || 'طالب',
      status: record.status,
      recordingMethod: record.recordingMethod || 'QR_SCAN',
      recordedAt: record.recordedAt || new Date().toISOString(),
      notes: record.notes || records[studentIdx]?.notes || null,
    };

    if (studentIdx >= 0) {
      records[studentIdx] = { ...records[studentIdx], ...updatedRecord };
    } else {
      records.push(updatedRecord);
    }

    const totalEnrolled = Math.max(records.length, currentReport.metrics?.totalEnrolled || 0);
    const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
    const excusedCount = records.filter((r: any) => r.status === 'EXCUSED').length;
    const absentCount = records.filter((r: any) => r.status === 'ABSENT' || !r.status).length;
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

  public async getConflicts(): Promise<SyncConflictRecord[]> {
    return this.getUnresolvedConflicts();
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

  /**
   * Completely wipes all stores in IndexedDB and in-memory caches.
   */
  public async wipeAllOfflineData(): Promise<void> {
    this.memoryStudents.clear();
    this.memoryGroups.clear();
    this.memorySessions.clear();
    this.memorySchedules.clear();
    this.memoryPayments.clear();
    this.memoryAssessments.clear();
    this.memoryCourses.clear();
    this.memoryMetadata.clear();
    this.memoryOutbox.clear();
    this.memoryRosters.clear();
    this.memoryDrafts.clear();
    this.memoryConflicts.clear();
    this.memoryCredentials.clear();
    this.memoryBooklets.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('el_awal_bootstrap_version');
        localStorage.removeItem('el_awal_last_sync_timestamp');
        localStorage.removeItem('el_awal_outbox_queue');
      } catch {}
    }

    if (!this.isSupported()) return;

    try {
      const db = await this.open();
      const storeNames = Array.from(db.objectStoreNames);
      if (storeNames.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeNames, 'readwrite');
        for (const storeName of storeNames) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Failed to completely wipe IndexedDB stores:', e);
    }
  }
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


