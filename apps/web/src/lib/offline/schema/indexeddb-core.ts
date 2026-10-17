import {
  StudentEntity,
  GroupEntity,
  SessionEntity,
  ScheduleEntity,
  BookletEntity,
  PaymentEntity,
  AssessmentEntity,
  CourseEntity,
  OutboxMutationRecord,
  OfflineRosterRecord,
  OfflineAssessmentRecord,
  OfflineCredentialsRecord,
  SyncConflictRecord,
  HomeworkRecordEntity,
} from '../types';

export const DB_NAME = 'el_awal_offline_db';
export const DB_VERSION = 5;

export class IndexedDbCore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  // In-memory relational fallback maps for SSR/Vitest/Node
  public memoryStudents: Map<string, StudentEntity> = new Map();
  public memoryGroups: Map<string, GroupEntity> = new Map();
  public memorySessions: Map<string, SessionEntity> = new Map();
  public memorySchedules: Map<string, ScheduleEntity> = new Map();
  public memoryPayments: Map<string, PaymentEntity> = new Map();
  public memoryAssessments: Map<string, AssessmentEntity> = new Map();
  public memoryCourses: Map<string, CourseEntity> = new Map();
  public memoryMetadata: Map<string, any> = new Map();
  public memoryOutbox: Map<string, OutboxMutationRecord> = new Map();
  public memoryRosters: Map<string, OfflineRosterRecord> = new Map();
  public memoryDrafts: Map<string, OfflineAssessmentRecord> = new Map();
  public memoryConflicts: Map<string, SyncConflictRecord> = new Map();
  public memoryCredentials: Map<string, OfflineCredentialsRecord> = new Map();
  public memoryReports: Map<string, any> = new Map();
  public memoryBooklets: Map<string, BookletEntity> = new Map();
  public memoryHomeworkRecords: Map<string, HomeworkRecordEntity> = new Map();

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && typeof indexedDB?.open === 'function';
  }

  public open(): Promise<IDBDatabase> {
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

          let outboxStore: IDBObjectStore;
          if (!db.objectStoreNames.contains('outbox_mutations')) {
            outboxStore = db.createObjectStore('outbox_mutations', { keyPath: 'id' });
            outboxStore.createIndex('idx_status', 'status', { unique: false });
            outboxStore.createIndex('idx_domain_status', ['domain', 'status'], { unique: false });
            outboxStore.createIndex('idx_clientTimestamp', 'clientTimestamp', { unique: false });
          } else {
            outboxStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('outbox_mutations');
          }
          if (!outboxStore.indexNames.contains('idx_userId')) {
            outboxStore.createIndex('idx_userId', 'userId', { unique: false });
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

          if (!db.objectStoreNames.contains('homework_records')) {
            const store = db.createObjectStore('homework_records', { keyPath: 'id' });
            store.createIndex('idx_session_student', ['sessionId', 'studentId'], { unique: false });
            store.createIndex('idx_studentId', 'studentId', { unique: false });
            store.createIndex('idx_syncStatus', 'syncStatus', { unique: false });
            store.createIndex('idx_assessmentId', 'assessmentId', { unique: false });
          }
        };

        request.onblocked = () => {
          console.warn('[OfflineDB] Database open blocked: another tab is using an older database version');
          this.dbPromise = null;
          reject(new Error('IndexedDB open blocked by another open tab'));
        };

        request.onsuccess = () => {
          const db = request.result;

          db.onversionchange = () => {
            console.warn('[OfflineDB] Database version change detected, closing connection');
            db.close();
            this.dbPromise = null;
          };

          db.onclose = () => {
            console.warn('[OfflineDB] Database connection closed unexpectedly');
            this.dbPromise = null;
          };

          resolve(db);
        };

        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      } catch (e) {
        this.dbPromise = null;
        reject(e);
      }
    });

    return this.dbPromise;
  }

  public async getStore(
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
  // Wipe Operations
  // ==========================================

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
    this.memoryHomeworkRecords.clear();
    this.memoryReports.clear();

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

  public async clearPeriodScopedData(): Promise<void> {
    const scopedStores = ['offline_roster_cache', 'students', 'groups', 'sessions'];

    this.memoryStudents.clear();
    this.memoryGroups.clear();
    this.memorySessions.clear();
    this.memoryRosters.clear();

    if (!this.isSupported()) return;

    try {
      const db = await this.open();
      const targets = scopedStores.filter((name) => db.objectStoreNames.contains(name));
      if (targets.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(targets, 'readwrite');
        for (const storeName of targets) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Failed to clear period-scoped IndexedDB stores:', e);
    }
  }
}
