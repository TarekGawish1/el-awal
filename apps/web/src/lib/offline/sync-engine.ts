/**
 * Robust Client Synchronization Engine for El Awal Platform
 * Handles network lifecycle, outbox queue flushing, optimistic retries,
 * domain topological ordering, and conflict recording.
 */

import { offlineDb, OutboxMutationRecord, MutationStatus } from './db';
import { API_BASE_URL, API_ENDPOINTS } from '../api/endpoints';
import { apiClient, isAccessTokenExpiredOrExpiring, refreshAccessToken } from '../api/client';
import { getStoredAccessToken, getStoredRefreshToken } from '@/features/auth/utils/auth-tokens';
import { bootstrapManager } from './bootstrap-manager';
import toast from 'react-hot-toast';

export interface OutgoingStudentSummary {
  id: string;
  fullName: string;
  phone?: string;
  gradeLevel?: string;
  groupName?: string;
}

export interface OutgoingGroupSummary {
  id: string;
  name: string;
  gradeLevel?: string;
  monthlyFee?: number;
}

export interface OutboxSummary {
  students: OutgoingStudentSummary[];
  groups: OutgoingGroupSummary[];
  attendanceCount: number;
  paymentsCount: number;
  totalCount: number;
}

export interface IncomingDiffSummary {
  groups: { count: number; items: any[] };
  students: { count: number; items: any[] };
  attendance: { count: number; items: any[] };
  payments: { count: number; items: any[] };
  serverTime: string;
}

export type PendingActivityKind =
  | 'BOOKLET_PAYMENT'
  | 'TUITION_PAYMENT'
  | 'ATTENDANCE_SCAN'
  | 'ENTITY_UPDATE'
  | 'DELETED_RECORD'
  | 'OTHER';

export interface PendingActivityItem {
  id: string;
  domain: OutboxMutationRecord['domain'];
  kind: PendingActivityKind;
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: number;
  raw: OutboxMutationRecord;
}

export type SyncEngineEventType =
  | 'ONLINE'
  | 'OFFLINE'
  | 'SYNC_START'
  | 'SYNC_PROGRESS'
  | 'SYNC_SUCCESS'
  | 'SYNC_ERROR'
  | 'MUTATION_ENQUEUED'
  | 'MUTATION_UNDONE'
  | 'SYNC_REVIEW_REQUIRED';

export type SyncEngineEventListener = (event: {
  type: SyncEngineEventType;
  pendingCount: number;
  data?: any;
}) => void;

function generateClientOperationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class OfflineSyncEngine {
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncingState: boolean = false;
  /** Promise-based mutex: all concurrent flushOutbox() callers await the same active sync. */
  private activeSyncPromise: Promise<{ synced: number; failed: number }> | null = null;
  private listeners: Set<SyncEngineEventListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncedAt: number | null = null;
  private queryClient: any = null;
  /**
   * When true, automatic dispatching (periodic checks, triggerSync) is paused
   * pending explicit user confirmation via <SyncConfirmationModal /> after reconnection.
   */
  private syncConfirmationRequired: boolean = false;

  public setQueryClient(client: any): void {
    this.queryClient = client;
    // Perform initial downstream delta pull to populate local db on startup
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => {
        this.checkAndSync();
      }, 1000);
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      offlineDb
        .getMetadata<number>('lastSyncedTimestamp')
        .then((ts) => {
          if (ts) this.lastSyncedAt = ts;
        })
        .catch(() => {});

      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Auto-sync on window focus or tab visibility (e.g. returning to app)
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.checkAndSync();
        }
      });
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          this.checkAndSync();
        }
      });

      // Periodic check and downstream pull every 15 seconds
      setInterval(() => {
        if (navigator.onLine && !this.isSyncingState && !bootstrapManager.isBootstrapping()) {
          this.checkAndSync();
        }
      }, 15000);
    }
  }

  public subscribe(listener: SyncEngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(type: SyncEngineEventType, data?: any) {
    offlineDb.getPendingCount().then((pendingCount) => {
      this.listeners.forEach((listener) => {
        try {
          listener({ type, pendingCount, data });
        } catch (e) {
          console.error('Error in sync listener:', e);
        }
      });
    });
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public isSyncing(): boolean {
    return this.isSyncingState;
  }

  public getLastSyncedAt(): number | null {
    return this.lastSyncedAt;
  }

  public setLastSyncedAt(timestamp: number): void {
    this.lastSyncedAt = timestamp;
    offlineDb.setMetadata('lastSyncedTimestamp', timestamp).catch(() => {});
  }

  public isAutoSyncEnabled(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return localStorage.getItem('el_awal_auto_sync_enabled') !== 'false';
  }

  public setAutoSyncEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('el_awal_auto_sync_enabled', enabled ? 'true' : 'false');
    }
  }

  /**
   * True while the app is blocking automatic outbox dispatching, awaiting the
   * user's explicit decision via <SyncConfirmationModal /> after reconnection.
   */
  public isSyncConfirmationRequired(): boolean {
    return this.syncConfirmationRequired;
  }

  /**
   * Fetches remote delta diff summary from GET /api/v1/sync/diff
   */
  public async getSyncDiff(since?: number): Promise<IncomingDiffSummary> {
    const lastBootstrapTime = await offlineDb.getMetadata<number>('lastBootstrapTimestamp');
    const lastSyncedTime = await offlineDb.getMetadata<number>('lastSyncedTimestamp');
    const timestamp = since || this.lastSyncedAt || lastSyncedTime || lastBootstrapTime;
    
    if (!timestamp) {
      return {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    }

    const isoDate = new Date(timestamp).toISOString();
    try {
      const res = await apiClient<IncomingDiffSummary>(
        `${API_ENDPOINTS.SYNC.DIFF}?since=${encodeURIComponent(isoDate)}`,
      );
      return res || {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    } catch {
      return {
        groups: { count: 0, items: [] },
        students: { count: 0, items: [] },
        attendance: { count: 0, items: [] },
        payments: { count: 0, items: [] },
        serverTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Summarizes all local pending outbox mutations categorized into students, groups, attendance, and payments.
   */
  public async getPendingOutboxSummary(): Promise<OutboxSummary> {
    const pending = await offlineDb.getPendingMutations();
    const allGroups = await offlineDb.getGroupsOffline();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    const students: OutgoingStudentSummary[] = [];
    const groups: OutgoingGroupSummary[] = [];
    let attendanceCount = 0;
    let paymentsCount = 0;

    for (const m of pending) {
      if (m.domain === 'students' && m.method === 'POST') {
        const payload = m.payload || {};
        const assignedGroupId = payload.groupId || payload.initialGroupId;
        students.push({
          id: m.optimisticId || m.id,
          fullName: payload.fullName || payload.name || 'طالب جديد',
          phone: payload.phone || payload.emergencyPhone || '',
          gradeLevel: payload.gradeLevel || '',
          groupName: assignedGroupId ? groupMap.get(assignedGroupId) || 'مجموعة محددة' : 'بدون مجموعة',
        });
      } else if (m.domain === 'groups' && m.method === 'POST') {
        const payload = m.payload || {};
        groups.push({
          id: m.optimisticId || m.id,
          name: payload.name || 'مجموعة جديدة',
          gradeLevel: payload.gradeLevel || '',
          monthlyFee: payload.monthlyFee || 0,
        });
      } else if (m.domain === 'attendance') {
        attendanceCount++;
      } else if (m.domain === 'finance') {
        paymentsCount++;
      }
    }

    return {
      students,
      groups,
      attendanceCount,
      paymentsCount,
      totalCount: pending.length,
    };
  }

  /**
   * Builds a rich, human-readable list of every pending local mutation for display
   * in <OfflineActivityDrawer /> and <SyncConfirmationModal />, resolving related
   * student/group/booklet names from local IndexedDB caches.
   */
  public async getDetailedPendingActivity(): Promise<PendingActivityItem[]> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return [];

    const pending = await offlineDb.getPendingMutations(currentUserId);
    const items: PendingActivityItem[] = [];

    for (const m of pending) {
      const payload = m.payload || {};

      if (m.domain === 'finance' && payload.type === 'DELETE_PAYMENT') {
        const snapshot = payload.previousPaymentSnapshot || {};
        const student = snapshot.studentId ? await offlineDb.getStudentByIdOffline(snapshot.studentId) : null;
        const targetName = student?.fullName || student?.user?.fullName || 'سجل مالي';
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'DELETED_RECORD',
          title: `حذف دفعة: ${targetName}`,
          subtitle: snapshot.bookletId ? 'مذكرة دراسية' : 'اشتراك شهري',
          amount: snapshot.amountPaid,
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      if (m.domain === 'finance') {
        const isBooklet = payload.paymentType === 'BOOKLET' || Boolean(payload.bookletId);
        const student = payload.studentId ? await offlineDb.getStudentByIdOffline(payload.studentId) : null;
        const studentName = student?.fullName || student?.user?.fullName || 'طالب';

        if (isBooklet) {
          const booklet = payload.bookletId ? await offlineDb.getBookletByIdOffline(payload.bookletId) : null;
          const resolvedAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : payload.amount !== undefined && Number(payload.amount) > 0
              ? Number(payload.amount)
              : booklet && Number(booklet.price) > 0
              ? Number(booklet.price)
              : 50;

          items.push({
            id: m.id,
            domain: m.domain,
            kind: 'BOOKLET_PAYMENT',
            title: `${studentName} • ${booklet?.title || 'مذكرة'}`,
            subtitle: `${resolvedAmount} ج.م`,
            amount: resolvedAmount,
            timestamp: m.clientTimestamp,
            raw: m,
          });
        } else {
          const group = payload.groupId ? await offlineDb.getGroupByIdOffline(payload.groupId) : null;
          const groupFee = Number(group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0);
          const resolvedAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : payload.amount !== undefined && Number(payload.amount) > 0
              ? Number(payload.amount)
              : groupFee > 0
              ? groupFee
              : 350;

          items.push({
            id: m.id,
            domain: m.domain,
            kind: 'TUITION_PAYMENT',
            title: `${studentName} • ${group?.name || 'المجموعة'}`,
            subtitle: `${payload.periodMonth ?? ''}/${payload.periodYear ?? ''} — ${resolvedAmount} ج.م`,
            amount: resolvedAmount,
            timestamp: m.clientTimestamp,
            raw: m,
          });
        }
        continue;
      }

      if ((m.domain === 'groups' || m.domain === 'students') && ['PATCH', 'PUT'].includes(m.method)) {
        const entityId = payload.id || m.endpoint.split('/').pop() || '';
        const isGroupUpdate = m.domain === 'groups';
        const name = isGroupUpdate
          ? (await offlineDb.getGroupByIdOffline(entityId))?.name || payload.name || 'مجموعة دراسية'
          : (await offlineDb.getStudentByIdOffline(entityId))?.fullName ||
            (await offlineDb.getStudentByIdOffline(entityId))?.user?.fullName ||
            payload.fullName ||
            'طالب';
        const changedFields = Object.keys(payload).filter((key) => key !== 'id').join('، ');
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'ENTITY_UPDATE',
          title: `تعديل ${isGroupUpdate ? 'مجموعة' : 'طالب'}: ${name}`,
          subtitle: changedFields || 'تحديث البيانات',
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      if (m.domain === 'attendance') {
        const student = payload.studentId ? await offlineDb.getStudentByIdOffline(payload.studentId) : null;
        const studentName = student?.fullName || student?.user?.fullName || 'طالب';
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find((s) => String(s.id) === String(payload.sessionId));
        const group = session?.groupId ? await offlineDb.getGroupByIdOffline(session.groupId) : null;
        items.push({
          id: m.id,
          domain: m.domain,
          kind: 'ATTENDANCE_SCAN',
          title: `${studentName} • ${group?.name || session?.group?.name || 'الجلسة الدراسية'}`,
          subtitle: payload.status || 'PRESENT',
          timestamp: m.clientTimestamp,
          raw: m,
        });
        continue;
      }

      items.push({
        id: m.id,
        domain: m.domain,
        kind: 'OTHER',
        title: payload.fullName || payload.name || m.endpoint,
        subtitle: m.method,
        timestamp: m.clientTimestamp,
        raw: m,
      });
    }

    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async handleNetworkChange(online: boolean) {
    if (online) {
      // Confirm genuine connectivity via fast ping
      const verified = await this.verifyConnection();
      this.isOnlineState = verified;
      if (verified) {
        this.notify('ONLINE');
        const pendingCount = await offlineDb.getPendingCount();
        if (pendingCount > 0) {
          // Silent auto-syncing on reconnection is disabled: pause automatic
          // dispatching and require explicit user confirmation via <SyncConfirmationModal />.
          this.syncConfirmationRequired = true;
          this.notify('SYNC_REVIEW_REQUIRED', { pendingCount });
        } else {
          this.triggerSync();
        }
      } else {
        this.notify('OFFLINE');
      }
    } else {
      this.isOnlineState = false;
      this.notify('OFFLINE');
    }
  }

  public async verifyConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/health/ping`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      // If the ping fails (CORS, DNS, network error), fall back to navigator.onLine
      // instead of assuming online — prevents false-positive that burns retry counters
      return typeof navigator !== 'undefined' ? navigator.onLine : false;
    }
  }

  /**
   * Enqueues an offline mutation into the outbox and triggers sync if online.
   */
  public async enqueue(
    domain: 'attendance' | 'finance' | 'progress' | 'assessments' | 'students' | 'groups' | 'generic',
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload: any,
    options: {
      conflictStrategy?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MONOTONIC' | 'MANUAL_REVIEW';
      optimisticId?: string;
      rollbackData?: unknown;
    } = {},
  ): Promise<string> {
    const id = generateClientOperationId();
    const mutation: OutboxMutationRecord = {
      id,
      domain,
      endpoint,
      method,
      payload,
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      conflictStrategy: options.conflictStrategy || 'CLIENT_WINS',
      optimisticId: options.optimisticId,
      rollbackData: options.rollbackData,
    };

    await offlineDb.enqueueMutation(mutation);
    this.notify('MUTATION_ENQUEUED', mutation);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineState;
    if (isOnline && !this.isSyncingState) {
      if (this.isAutoSyncEnabled()) {
        this.syncConfirmationRequired = false;
      }
      this.triggerSync();
    }

    return id;
  }

  public triggerSync(): void {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineState;
    if (!isOnline) return;
    // Automatic dispatching stays paused until the user confirms via <SyncConfirmationModal />.
    if (this.syncConfirmationRequired) return;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.flushOutbox();
    }, 300);
  }

  private async checkAndSync() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineState;
    if (!isOnline) return;
    if (this.syncConfirmationRequired) return;

    const verified = await this.verifyConnection();
    if (verified) {
      // 1. Flush any pending outgoing mutations created on this device
      await this.flushOutbox();

      // 2. Automatically pull incremental updates (students, groups, sessions, etc.)
      //    added by other devices into the local IndexedDB database
      if (this.isAutoSyncEnabled() && !bootstrapManager.isBootstrapping()) {
        try {
          await bootstrapManager.performBootstrap({ queryClient: this.queryClient });
        } catch (err) {
          console.warn('Background auto-pull downstream sync error:', err);
        }
      }
    }
  }

  /**
   * Topological Flush Protocol:
   * 1. Entity Creations (groups -> students -> schedules)
   * 2. Domain Batch Endpoints (attendance -> finance -> progress -> assessments)
   * 3. Remaining Generic FIFO mutations
   *
   * @param options.mutationIds Restrict the flush to only these outbox mutation ids
   *   (used when the user selects a subset of pending actions in <SyncConfirmationModal />).
   * @param options.force Bypass the reconnection confirmation gate (used once the user
   *   has explicitly confirmed via <SyncConfirmationModal />).
   */
  public async flushOutbox(options?: {
    mutationIds?: string[];
    force?: boolean;
  }): Promise<{ synced: number; failed: number }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineState;
    if (!isOnline) {
      return { synced: 0, failed: 0 };
    }
    if (this.syncConfirmationRequired && !options?.force) {
      return { synced: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && navigator.locks) {
      if (this.activeSyncPromise) {
        return this.activeSyncPromise;
      }

      const lockPromise = new Promise<{ synced: number; failed: number }>((resolve, reject) => {
        navigator.locks.request('offline_sync_lock', { mode: 'exclusive', ifAvailable: true }, async (lock) => {
          if (!lock) {
            // Another tab currently holds the lock and is flushing.
            // Safely skip this execution to prevent multi-tab concurrency.
            resolve({ synced: 0, failed: 0 });
            return;
          }
          try {
            const result = await this.executeFlush(options);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });

      this.activeSyncPromise = lockPromise;

      try {
        return await lockPromise;
      } finally {
        this.activeSyncPromise = null;
      }
    }

    // Fallback for environments without Web Locks API
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const syncExecution = this.executeFlush(options);
    this.activeSyncPromise = syncExecution;

    try {
      return await syncExecution;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  /**
   * Internal flush implementation — always called via flushOutbox() which
   * provides the mutex guarantee.
   */
  private async executeFlush(options?: {
    mutationIds?: string[];
    force?: boolean;
  }): Promise<{ synced: number; failed: number }> {

    // ── Pre-flight authentication guard ──────────────────────────────────────
    // Proactively refresh the access token before starting any network work so
    // that 401 errors don’t cascade across all outbox items and burn their retry
    // counters.  The guard only activates when a refresh token is present in
    // storage — this lets test environments (where localStorage has no tokens)
    // proceed through to the mocked apiClient without interference.
    const storedRefreshToken = getStoredRefreshToken();
    if (storedRefreshToken) {
      const accessToken = getStoredAccessToken();
      if (!accessToken || isAccessTokenExpiredOrExpiring()) {
        const fresh = await refreshAccessToken();
        if (!fresh) {
          // Both tokens rejected – user is genuinely logged out.
          // Pause without incrementing retry counters.
          return { synced: 0, failed: 0 };
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) {
      return { synced: 0, failed: 0 };
    }

    // Recover any mutations stranded in SYNCING state by previous crashes or OS kills
    await offlineDb.recoverOrphanedSyncingMutations(currentUser.id);

    let pending = await offlineDb.getPendingMutations(currentUser.id);
    if (options?.mutationIds) {
      const allowed = new Set(options.mutationIds);
      pending = pending.filter((m) => allowed.has(m.id));
    }

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Purge expired mutations (TTL 7 days)
    const expiredMutations = pending.filter(m => now - (m.clientTimestamp || 0) > SEVEN_DAYS_MS);
    for (const m of expiredMutations) {
      await this.handleFailedMutation(m, 'Mutation expired (TTL 7 days exceeded)');
    }
    pending = pending.filter(m => now - (m.clientTimestamp || 0) <= SEVEN_DAYS_MS);

    // Filter out mutations that were recently attempted and failed — enforce
    // a bounded exponential backoff between retry attempts for the same mutation
    // to prevent aggressive server hammering. (30s, 60s, 120s... max ~32 mins)
    const BASE_RETRY_DELAY_MS = 30_000;
    pending = pending.filter((m) => {
      if (m.status === 'FAILED' && m.lastAttemptAt) {
        const backoffMultiplier = Math.pow(2, Math.min(m.retryCount || 0, 6));
        const requiredDelay = BASE_RETRY_DELAY_MS * backoffMultiplier;
        return (now - m.lastAttemptAt) >= requiredDelay;
      }
      return true;
    });

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncingState = true;
    this.notify('SYNC_START', { pendingCount: pending.length });

    // STRICT TWO-PHASE STEP 1: Pause background queries from refetching stale server state
    if (this.queryClient) {
      this.queryClient.cancelQueries();
    }

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Flush Group and Student Creations (using Unified Batch or Fallback)
      const groupCreations = pending.filter(
        (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.GROUPS.CREATE,
      );
      const studentCreations = pending.filter(
        (m) => m.domain === 'students' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.STUDENTS.CREATE,
      );

      if (groupCreations.length > 0 || studentCreations.length > 0) {
        const batchDto = {
          groups: groupCreations.map((g) => ({
            clientTempId: g.optimisticId || g.id,
            name: g.payload?.name,
            gradeLevel: g.payload?.gradeLevel,
            academicYear: g.payload?.academicYear || '2026-2027',
            academicTerm: g.payload?.academicTerm || 'FIRST_TERM',
            maxCapacity: g.payload?.maxCapacity,
            monthlyFee: g.payload?.monthlyFee,
            description: g.payload?.description,
            schedules: g.payload?.schedules,
          })),
          students: studentCreations.map((s) => ({
            clientTempId: s.optimisticId || s.id,
            name: s.payload?.fullName || s.payload?.name,
            fullName: s.payload?.fullName || s.payload?.name,
            phone: s.payload?.phone,
            email: s.payload?.email,
            password: s.payload?.password,
            gradeLevel: s.payload?.gradeLevel,
            academicStage: s.payload?.academicStage,
            academicYear: s.payload?.academicYear || '2026-2027',
            academicTerm: s.payload?.academicTerm || 'FIRST_TERM',
            parentName: s.payload?.parentName,
            parentPhone: s.payload?.parentPhone,
            parentRelationship: s.payload?.parentRelationship,
            groupId: s.payload?.groupId || s.payload?.initialGroupId,
            initialGroupId: s.payload?.groupId || s.payload?.initialGroupId,
          })),
        };

        try {
          const res = await apiClient<any>(API_ENDPOINTS.SYNC.BATCH, {
            method: 'POST',
            body: JSON.stringify(batchDto),
          });

          if (res?.idMappings) {
            await offlineDb.reconcileEntityIds(res.idMappings);
          }

          for (const item of groupCreations) {
            await offlineDb.removeMutation(item.id);
            syncedCount++;
          }
          for (const item of studentCreations) {
            await offlineDb.removeMutation(item.id);
            syncedCount++;
          }
        } catch (batchErr: any) {
          // Fallback to individual items if batch rejected or failed
          for (const item of groupCreations) {
            try {
              await offlineDb.updateMutationStatus(item.id, 'SYNCING');
              const res = await apiClient<any>(item.endpoint, {
                method: item.method,
                body: item.payload ? JSON.stringify(item.payload) : undefined,
              });
              if (res?.id && item.optimisticId && res.id !== item.optimisticId) {
                const localGroup = await offlineDb.getGroupByIdOffline(item.optimisticId);
                if (localGroup) {
                  await offlineDb.removeGroup(item.optimisticId);
                  await offlineDb.bulkPutGroups([{ ...localGroup, id: res.id }]);
                }
              }
              await offlineDb.removeMutation(item.id);
              syncedCount++;
            } catch (err: any) {
              await this.handleFailedMutation(item, err.message);
              failedCount++;
            }
          }

          for (const item of studentCreations) {
            try {
              await offlineDb.updateMutationStatus(item.id, 'SYNCING');
              const res = await apiClient<any>(item.endpoint, {
                method: item.method,
                body: item.payload ? JSON.stringify(item.payload) : undefined,
              });
              if (res?.id && item.optimisticId && res.id !== item.optimisticId) {
                const localStudent = await offlineDb.getStudentByIdOffline(item.optimisticId);
                if (localStudent) {
                  await offlineDb.removeStudent(item.optimisticId);
                  await offlineDb.bulkPutStudents([{ ...localStudent, id: res.id }]);
                }
              }
              await offlineDb.removeMutation(item.id);
              syncedCount++;
            } catch (err: any) {
              await this.handleFailedMutation(item, err.message);
              failedCount++;
            }
          }
        }
      }

      // 3. Flush Group Enrollments (after groups and students exist)
      const groupEnrollments = pending.filter(
        (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint !== API_ENDPOINTS.GROUPS.CREATE,
      );
      for (const item of groupEnrollments) {
        try {
          await offlineDb.updateMutationStatus(item.id, 'SYNCING');
          await apiClient<any>(item.endpoint, {
            method: item.method,
            body: item.payload ? JSON.stringify(item.payload) : undefined,
          });
          await offlineDb.removeMutation(item.id);
          syncedCount++;
        } catch (err: any) {
          await this.handleFailedMutation(item, err.message);
          failedCount++;
        }
      }

      // 4. Batch Onsite Homework and Attendance Sync via API_ENDPOINTS.SYNC.BATCH
      const attendanceAndHomeworkItems = pending.filter(
        (m) =>
          m.type === 'RECORD_HOMEWORK_ONSITE' ||
          m.type === 'RECORD_ATTENDANCE' ||
          m.payload?.type === 'RECORD_HOMEWORK_ONSITE' ||
          m.payload?.type === 'RECORD_ATTENDANCE' ||
          m.endpoint?.includes('/sync/homework') ||
          (m.domain === 'attendance' && m.method === 'POST'),
      );

      if (attendanceAndHomeworkItems.length > 0) {
        // Verify all mutations retain full payload integrity
        const batchPayload = attendanceAndHomeworkItems.map((m) => {
          const mutationType =
            m.type ||
            m.payload?.type ||
            (m.endpoint?.includes('/sync/homework') ? 'RECORD_HOMEWORK_ONSITE' : 'RECORD_ATTENDANCE');

          return {
            id: m.id,
            type: mutationType,
            payload: {
              assessmentId: m.payload?.assessmentId,
              studentId: m.payload?.studentId,
              sessionId: m.payload?.sessionId,
              qrCodeToken: m.payload?.qrCodeToken,
              status:
                m.payload?.status ||
                (mutationType === 'RECORD_HOMEWORK_ONSITE' ? 'CHECKED_ONSITE' : 'PRESENT'),
              recordedMethod:
                m.payload?.recordedMethod || m.payload?.recordingMethod || 'QR_SCAN',
              recordingMethod:
                m.payload?.recordingMethod || m.payload?.recordedMethod || 'QR_SCAN',
              score: m.payload?.score ?? null,
              feedback: m.payload?.feedback,
              notes: m.payload?.notes,
              clientTimestamp: m.payload?.clientTimestamp || m.clientTimestamp,
            },
            clientTimestamp: m.clientTimestamp,
          };
        });

        try {
          const res = await apiClient<any>(API_ENDPOINTS.SYNC.BATCH, {
            method: 'POST',
            body: JSON.stringify(batchPayload),
          });

          // Only mark an outbox item as SYNCED or delete it from IndexedDB if the backend explicitly returns success (status: 'SUCCESS')
          if (res?.results && Array.isArray(res.results)) {
            for (const itemResult of res.results) {
              if (itemResult.status === 'SUCCESS') {
                await offlineDb.removeMutation(itemResult.mutationId);
                syncedCount++;
              } else {
                const target = attendanceAndHomeworkItems.find((m) => m.id === itemResult.mutationId);
                if (target) {
                  await this.handleFailedMutation(target, itemResult.error || 'Server rejected mutation');
                }
                failedCount++;
              }
            }
          } else if (res?.processedOperationIds && Array.isArray(res.processedOperationIds)) {
            for (const id of res.processedOperationIds) {
              await offlineDb.removeMutation(id);
              syncedCount++;
            }
          } else if (res?.syncedCount !== undefined || res?.success) {
            for (const item of attendanceAndHomeworkItems) {
              await offlineDb.removeMutation(item.id);
              syncedCount++;
            }
          }
        } catch (err: any) {
          console.error('Batch sync failed:', err);
          for (const item of attendanceAndHomeworkItems) {
            await this.handleFailedMutation(item, err.message);
            failedCount++;
          }
        }
      }

      // 5. Batch Payments Sync (includes both payment creations and DELETE_PAYMENT reversals)
      const paymentItems = pending.filter((m) => m.domain === 'finance');
      if (paymentItems.length > 0) {
        try {
          const operations = paymentItems.map((item) => {
            if (item.payload?.type === 'DELETE_PAYMENT') {
              return {
                id: item.id,
                type: 'DELETE_PAYMENT' as const,
                paymentId: item.payload.paymentId,
                clientTimestamp: item.clientTimestamp,
              };
            }
            return {
              id: item.id,
              studentId: item.payload.studentId,
              groupId: item.payload.groupId,
              paymentType: item.payload.paymentType || (item.payload.bookletId ? 'BOOKLET' : 'TUITION'),
              bookletId: item.payload.bookletId,
              periodYear: item.payload.periodYear,
              periodMonth: item.payload.periodMonth,
              amountPaid: item.payload.amountPaid,
              amountExpected: item.payload.amountExpected,
              paymentMethod: item.payload.paymentMethod || 'CASH',
              receiptNumber: item.payload.receiptNumber,
              notes: item.payload.notes,
              clientTimestamp: item.clientTimestamp,
              collectedAt: item.payload.collectedAt,
            };
          });

          const res = await apiClient<any>(API_ENDPOINTS.SYNC.PAYMENTS, {
            method: 'POST',
            body: JSON.stringify({ operations }),
          });

          if (res?.idMappings) {
            await offlineDb.reconcileEntityIds({ payments: res.idMappings });
          }

          if (res?.processedOperationIds) {
            for (const id of res.processedOperationIds) {
              await offlineDb.removeMutation(id);
              syncedCount++;
            }
          }

          if (res?.conflicts && res.conflicts.length > 0) {
            for (const conf of res.conflicts) {
              await offlineDb.recordConflict({
                id: generateClientOperationId(),
                operationId: conf.operationId,
                domain: 'finance',
                reason: conf.reason,
                payload: operations.find((o) => o.id === conf.operationId),
                timestamp: Date.now(),
                resolved: false,
              });
              await offlineDb.removeMutation(conf.operationId);
              failedCount++;
            }
          }
        } catch (err: any) {
          console.error('Batch payments sync failed:', err);
          for (const item of paymentItems) {
            await this.handleFailedMutation(item, err.message);
            failedCount++;
          }
        }
      }

      // 6. Batch Progress Sync
      const progressItems = pending.filter((m) => m.domain === 'progress' && m.method === 'POST');
      if (progressItems.length > 0) {
        try {
          const operations = progressItems.map((item) => ({
            clientOperationId: item.id,
            courseId: item.payload.courseId,
            lessonId: item.payload.lessonId,
            lastPositionSeconds: item.payload.lastPositionSeconds || 0,
            isCompleted: item.payload.isCompleted || false,
            clientTimestamp: item.clientTimestamp,
          }));

          const res = await apiClient<any>(API_ENDPOINTS.SYNC.PROGRESS, {
            method: 'POST',
            body: JSON.stringify({ operations }),
          });

          if (res?.processedOperationIds) {
            for (const id of res.processedOperationIds) {
              await offlineDb.removeMutation(id);
              syncedCount++;
            }
          }
        } catch (err: any) {
          console.error('Batch progress sync failed:', err);
          for (const item of progressItems) {
            await this.handleFailedMutation(item, err.message);
            failedCount++;
          }
        }
      }

      // 7. Batch Assessments Sync
      const assessmentItems = pending.filter((m) => m.domain === 'assessments' && m.method === 'POST');
      if (assessmentItems.length > 0) {
        try {
          const operations = assessmentItems.map((item) => ({
            id: item.id,
            assessmentId: item.payload.assessmentId,
            answers: item.payload.answers || [],
            attachmentUrl: item.payload.attachmentUrl,
            clientTimestamp: item.clientTimestamp,
          }));

          const res = await apiClient<any>(API_ENDPOINTS.SYNC.ASSESSMENTS, {
            method: 'POST',
            body: JSON.stringify({ operations }),
          });

          if (res?.processedOperationIds) {
            for (const id of res.processedOperationIds) {
              await offlineDb.removeMutation(id);
              syncedCount++;
            }
          }

          if (res?.conflicts && res.conflicts.length > 0) {
            for (const conf of res.conflicts) {
              await offlineDb.recordConflict({
                id: generateClientOperationId(),
                operationId: conf.operationId,
                domain: 'assessments',
                reason: conf.reason,
                payload: operations.find((o) => o.id === conf.operationId),
                timestamp: Date.now(),
                resolved: false,
              });
              await offlineDb.removeMutation(conf.operationId);
              failedCount++;
            }
          }
        } catch (err: any) {
          console.error('Batch assessments sync failed:', err);
          for (const item of assessmentItems) {
            await this.handleFailedMutation(item, err.message);
            failedCount++;
          }
        }
      }

      // 8. Generic / Remaining mutations (Sequential FIFO)
      const remainingGeneric = pending.filter(
        (m) =>
          !groupCreations.includes(m) &&
          !studentCreations.includes(m) &&
          !groupEnrollments.includes(m) &&
          !attendanceAndHomeworkItems.includes(m) &&
          !paymentItems.includes(m) &&
          !progressItems.includes(m) &&
          !assessmentItems.includes(m),
      );

      for (const item of remainingGeneric) {
        try {
          await offlineDb.updateMutationStatus(item.id, 'SYNCING');
          await apiClient(item.endpoint, {
            method: item.method,
            body: item.payload ? JSON.stringify(item.payload) : undefined,
          });
          await offlineDb.removeMutation(item.id);
          syncedCount++;
        } catch (err: any) {
          await this.handleFailedMutation(item, err.message);
          failedCount++;
        }
      }

      this.setLastSyncedAt(Date.now());
      if (syncedCount > 0) {
        toast.success(`تمت مزامنة ${syncedCount} من العمليات المحفوظة بنجاح 🚀`, {
          id: 'sync-success',
        });
      }
      this.notify('SYNC_SUCCESS', { syncedCount, failedCount });

      if (this.queryClient) {
        this.queryClient.invalidateQueries({ queryKey: ['groups'] });
        this.queryClient.invalidateQueries({ queryKey: ['academic-groups'] });
        this.queryClient.invalidateQueries({ queryKey: ['students'] });
        this.queryClient.invalidateQueries({ queryKey: ['attendance'] });
        this.queryClient.invalidateQueries({ queryKey: ['finance'] });
        this.queryClient.invalidateQueries({ queryKey: ['payments'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-payments'] });
        this.queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
        this.queryClient.invalidateQueries({ queryKey: ['session-details'] });
        this.queryClient.invalidateQueries({ queryKey: ['homework-records'] });
        this.queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-group-sessions'] });
        if (typeof this.queryClient.refetchQueries === 'function') {
          this.queryClient.refetchQueries({ type: 'active' });
        }
      }

      // 8. Downstream Pull: fetch the delta snapshot from the server and merge it
      // into IndexedDB so the local cache reflects any concurrent remote changes.
      // Only triggered when at least one mutation was successfully synced; a flush
      // with zero synced items (e.g. all-failed or empty outbox) does NOT need a
      // downstream pull because nothing changed on the server side from our end.
      if (syncedCount > 0) {
        try {
          await bootstrapManager.performBootstrap({ queryClient: this.queryClient });
        } catch (pullErr) {
          console.warn('Downstream bootstrap sync error after outbox flush:', pullErr);
        }
      }
    } finally {
      this.isSyncingState = false;
    }

    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Explicit user-confirmed sync entry point for the reconnection flow.
   * Called by <SyncConfirmationModal /> when the user clicks "Sync Now", optionally
   * restricted to a checklist-selected subset of pending mutation ids.
   */
  public async confirmAndSync(selectedMutationIds?: string[]): Promise<{ synced: number; failed: number }> {
    this.syncConfirmationRequired = false;
    return this.flushOutbox({ mutationIds: selectedMutationIds, force: true });
  }

  /**
   * Re-queues conflict records back into the outbox so they are flushed on the
   * next sync.  When `conflictIds` is omitted every unresolved conflict is
   * re-enqueued.  A fresh access token is obtained first.
   *
   * Returns the number of conflicts successfully re-queued.
   */
  public async retryConflicts(conflictIds?: string[]): Promise<number> {
    // Ensure we have a valid token before attempting to re-dispatch.
    const fresh = await refreshAccessToken();
    if (!fresh && !getStoredAccessToken()) {
      throw new Error('يرجى تسجيل الدخول أولاً قبل إعادة المحاولة');
    }

    const allConflicts = await offlineDb.getConflicts();
    const targets = conflictIds
      ? allConflicts.filter((c) => conflictIds.includes(c.id))
      : allConflicts;

    if (targets.length === 0) return 0;

    const domainEndpointMap: Partial<
      Record<OutboxMutationRecord['domain'], { endpoint: string; method: OutboxMutationRecord['method'] }>
    > = {
      attendance: { endpoint: API_ENDPOINTS.SYNC.ATTENDANCE, method: 'POST' },
      finance: { endpoint: API_ENDPOINTS.SYNC.PAYMENTS, method: 'POST' },
      students: { endpoint: API_ENDPOINTS.STUDENTS.CREATE, method: 'POST' },
      groups: { endpoint: API_ENDPOINTS.GROUPS.CREATE, method: 'POST' },
      assessments: { endpoint: API_ENDPOINTS.SYNC.ASSESSMENTS, method: 'POST' },
    };

    let count = 0;
    for (const conflict of targets) {
      let endpoint = domainEndpointMap[conflict.domain as OutboxMutationRecord['domain']]?.endpoint;
      const method = domainEndpointMap[conflict.domain as OutboxMutationRecord['domain']]?.method || 'POST';

      if (
        conflict.domain === 'attendance' &&
        (conflict.payload?.assessmentId ||
          conflict.payload?.type === 'RECORD_HOMEWORK_ONSITE' ||
          conflict.payload?.feedback !== undefined ||
          conflict.payload?.score !== undefined)
      ) {
        endpoint = API_ENDPOINTS.SYNC.HOMEWORK;
      }

      if (!endpoint || !conflict.payload) continue;

      await this.enqueue(
        conflict.domain as OutboxMutationRecord['domain'],
        endpoint,
        method,
        conflict.payload,
      );
      await offlineDb.resolveConflict(conflict.id, 'إعادة المحاولة التلقائية');
      count++;
    }

    if (count > 0) {
      this.triggerSync();
    }

    return count;
  }

  /**
   * Resets all outbox mutations that failed due to transient auth errors back
   * to PENDING with retryCount = 0, making them eligible for the next flush.
   */
  public async resetFailedMutations(): Promise<number> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return 0;

    const all = await offlineDb.getPendingMutations(currentUserId);
    const failed = all.filter((m) => m.status === 'FAILED');
    for (const m of failed) {
      await offlineDb.resetMutationForRetry(m.id);
    }
    return failed.length;
  }

  /**
   * Closes the confirmation prompt without dispatching anything. Pending mutations
   * remain untouched in the outbox and automatic dispatching stays paused until the
   * user later confirms or discards them.
   */
  public deferSyncConfirmation(): void {
    this.notify('SYNC_REVIEW_REQUIRED');
  }

  /**
   * Reverts the local side-effects of a single pending outbox mutation and removes
   * it from the outbox, without contacting the server. Used by the individual
   * "Undo" action in <OfflineActivityDrawer /> and <SyncConfirmationModal />.
   */
  public async undoMutation(mutationId: string): Promise<void> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return;

    const pending = await offlineDb.getPendingMutations(currentUserId);
    const mutation = pending.find((m) => m.id === mutationId);
    if (!mutation) return;

    const payload = mutation.payload || {};

    try {
      if (mutation.domain === 'finance') {
        if (payload.type === 'DELETE_PAYMENT') {
          const snapshot = payload.previousPaymentSnapshot;
          if (snapshot) {
            await offlineDb.putPayment(snapshot);
            if (snapshot.studentId) {
              await offlineDb.markStudentPaidOffline(snapshot.studentId, snapshot);
            }
            if (snapshot.paymentType === 'BOOKLET' && snapshot.bookletId) {
              const booklet = await offlineDb.getBookletByIdOffline(snapshot.bookletId);
              if (booklet) {
                await offlineDb.putBooklet({
                  ...booklet,
                  stockCount:
                    booklet.stockCount !== null && booklet.stockCount !== undefined
                      ? Math.max(0, booklet.stockCount - 1)
                      : booklet.stockCount,
                  salesCount: (booklet.salesCount || 0) + 1,
                  totalRevenue: (booklet.totalRevenue || 0) + Number(snapshot.amountPaid || 0),
                });
              }
            }
          }
        } else {
          const paymentId = mutation.optimisticId || payload.id;
          if (paymentId) {
            await offlineDb.deletePaymentLocally(paymentId);
          }
        }
      } else if (mutation.domain === 'attendance') {
        if (payload.sessionId && payload.studentId) {
          await offlineDb.revertAttendanceRecordOffline(payload.sessionId, payload.studentId);
        }
      } else if (mutation.domain === 'students' && mutation.method === 'POST') {
        const studentId = mutation.optimisticId || payload.id;
        if (studentId) {
          await offlineDb.removeStudent(studentId);
        }
      } else if (mutation.domain === 'groups' && mutation.method === 'POST') {
        const groupId = mutation.optimisticId || payload.id;
        if (groupId) {
          await offlineDb.removeGroup(groupId);
        }
      } else if (mutation.domain === 'groups' && ['PATCH', 'PUT'].includes(mutation.method)) {
        const previousGroup = mutation.rollbackData as any;
        if (previousGroup?.id) {
          await offlineDb.bulkPutGroups([previousGroup]);
          const roster = await offlineDb.getRoster(previousGroup.id);
          if (roster) {
            await offlineDb.cacheRoster({
              ...roster,
              groupName: previousGroup.name || roster.groupName,
              gradeLevel: previousGroup.gradeLevel || roster.gradeLevel,
              monthlyFee: previousGroup.monthlyFee ?? roster.monthlyFee,
              sessions: previousGroup.schedules ?? roster.sessions,
              updatedAt: Date.now(),
            });
          }
        }
      } else if (mutation.domain === 'students' && ['PATCH', 'PUT'].includes(mutation.method)) {
        const previousStudent = mutation.rollbackData as any;
        if (previousStudent?.id) {
          await offlineDb.bulkPutStudents([previousStudent]);
        }
      }
    } finally {
      await offlineDb.removeMutation(mutationId);
      if (this.queryClient) {
        this.queryClient.invalidateQueries({ queryKey: ['finance'] });
        this.queryClient.invalidateQueries({ queryKey: ['payments'] });
        this.queryClient.invalidateQueries({ queryKey: ['booklets'] });
        this.queryClient.invalidateQueries({ queryKey: ['students'] });
        this.queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      }
      this.notify('MUTATION_UNDONE', mutation);
    }
  }

  /**
   * Called by <SyncConfirmationModal /> when the user clicks "Discard Local Changes".
   * Reverts and purges every pending outbox mutation, then re-hydrates fresh state
   * from the remote database via a full bootstrap pull.
   */
  public async discardAllLocalChanges(): Promise<{ discardedCount: number }> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUserId) return { discardedCount: 0 };

    const pending = await offlineDb.getPendingMutations(currentUserId);
    for (const m of pending) {
      await this.undoMutation(m.id);
    }

    this.syncConfirmationRequired = false;

    try {
      await bootstrapManager.performBootstrap({ forceFull: true, queryClient: this.queryClient });
    } catch (e) {
      console.warn('Failed to rehydrate after discarding local changes:', e);
    }

    if (this.queryClient) {
      this.queryClient.invalidateQueries();
    }

    this.notify('SYNC_SUCCESS', { syncedCount: 0, failedCount: 0, discarded: pending.length });
    return { discardedCount: pending.length };
  }

  /**
   * High-level bi-directional sync coordinator with stepped progress reporting.
   * Flushes outgoing mutations to PostgreSQL and pulls incoming snapshot updates.
   */
  public async executeBidirectionalSync(
    onProgress?: (progress: number, step: string) => void,
  ): Promise<{ synced: number; failed: number }> {
    onProgress?.(10, 'فحص الاتصال وتجهيز البيانات...');
    this.notify('SYNC_PROGRESS', { progress: 10, step: 'CONNECTING' });

    onProgress?.(35, 'رفع العمليات والبيانات المحلية إلى السحابة...');
    this.notify('SYNC_PROGRESS', { progress: 35, step: 'PUSHING_OUTBOX' });
    this.syncConfirmationRequired = false;
    const pushResult = await this.flushOutbox({ force: true });

    onProgress?.(70, 'تحديث المعرفات ومطابقة السجلات...');
    this.notify('SYNC_PROGRESS', { progress: 70, step: 'RECONCILING' });

    onProgress?.(85, 'تحميل التحديثات من الخادم وتحديث التخزين المحلي...');
    this.notify('SYNC_PROGRESS', { progress: 85, step: 'PULLING_DIFF' });
    // Always pull the downstream delta here (skipCooldown) because the user
    // explicitly requested a bi-directional sync.  If flushOutbox already ran
    // a bootstrap the cooldown guard in bootstrap-manager will have updated
    // lastBootstrapAt, but skipCooldown ensures we still fetch the latest diff
    // so the UI reflects any concurrent remote changes immediately.
    try {
      await bootstrapManager.performBootstrap({ queryClient: this.queryClient, skipCooldown: true });
    } catch (e) {
      console.warn('Bootstrap refresh error during bidirectional sync:', e);
    }

    this.setLastSyncedAt(Date.now());
    onProgress?.(100, 'اكتملت المزامنة بنجاح 🎉');
    this.notify('SYNC_PROGRESS', { progress: 100, step: 'COMPLETE' });

    return pushResult;
  }

  /** Returns true when the error message indicates a transient authentication failure. */
  private isAuthError(errorMessage: string): boolean {
    return (
      errorMessage?.includes('401') ||
      errorMessage?.includes('Authentication required') ||
      errorMessage?.includes('Unauthorized') ||
      errorMessage?.includes('انتهت صلاحية') ||
      errorMessage?.includes('Authentication')
    );
  }

  /** Returns true when the conflict reason is auth-related and safe to re-queue. */
  private isAuthConflictReason(reason: string): boolean {
    return (
      reason?.includes('Authentication required') ||
      reason?.includes('Unauthorized') ||
      reason?.includes('401') ||
      reason?.includes('انتهت صلاحية')
    );
  }

  private async handleFailedMutation(mutation: OutboxMutationRecord, errorMessage: string) {
    // Auth failures are transient — do NOT increment the retry counter or
    // promote to a permanent conflict.  The pre-flight guard in flushOutbox
    // will refresh the token on the next attempt so these mutations succeed.
    if (this.isAuthError(errorMessage)) {
      await offlineDb.updateMutationStatus(mutation.id, 'PENDING');
      return;
    }

    const isValidationError =
      errorMessage?.includes('already registered') ||
      errorMessage?.includes('Collision') ||
      errorMessage?.includes('400') ||
      errorMessage?.includes('409') ||
      errorMessage?.includes('422') ||
      errorMessage?.includes('تكرار') ||
      errorMessage?.includes('مسجل مسبقاً');

    if (isValidationError) {
      await offlineDb.recordConflict({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateClientOperationId(),
        operationId: mutation.id,
        domain: mutation.domain,
        reason: `تعذر إتمام العملية على الخادم: ${errorMessage}`,
        payload: mutation.payload,
        timestamp: Date.now(),
        resolved: false,
      });

      // If this was an optimistic student creation that failed permanently, prune local entity
      if (mutation.domain === 'students' && mutation.method === 'POST') {
        const studentId = mutation.optimisticId || mutation.payload?.id;
        if (studentId) {
          await offlineDb.removeStudent(studentId);
          if (this.queryClient) {
            this.queryClient.setQueriesData({ queryKey: ['students'] }, (old: any) => {
              if (!old) return old;
              if (Array.isArray(old)) return old.filter((s: any) => s.id !== studentId);
              if (old.data && Array.isArray(old.data)) {
                return {
                  ...old,
                  data: old.data.filter((s: any) => s.id !== studentId),
                  meta: { ...old.meta, total: Math.max(0, (old.meta?.total || 1) - 1) },
                };
              }
              return old;
            });
          }
        }
      }

      await offlineDb.removeMutation(mutation.id);
    } else {
      await offlineDb.updateMutationStatus(mutation.id, 'FAILED', errorMessage);
      // For persistent network/server errors (>= 3 retries), optionally record a conflict 
      // so the user is aware, but DO NOT remove it from the outbox. It will keep retrying with backoff.
      if (mutation.retryCount >= 3) {
        const existingConflicts = await offlineDb.getUnresolvedConflicts();
        if (!existingConflicts.some(c => c.operationId === mutation.id)) {
           await offlineDb.recordConflict({
             id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateClientOperationId(),
             operationId: mutation.id,
             domain: mutation.domain,
             reason: `تأخر مزامنة العملية بسبب مشاكل في الاتصال أو الخادم: ${errorMessage}`,
             payload: mutation.payload,
             timestamp: Date.now(),
             resolved: false,
           });
        }
      }
    }
  }
}

export const syncEngine = new OfflineSyncEngine();
