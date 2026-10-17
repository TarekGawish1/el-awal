import { offlineDb, OutboxMutationRecord } from '../db';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { isAccessTokenExpiredOrExpiring, refreshAccessToken } from '@/lib/api/client';
import { getStoredAccessToken, getStoredRefreshToken } from '@/features/auth/utils/auth-tokens';
import { bootstrapManager } from '../bootstrap-manager';
import toast from 'react-hot-toast';
import { SyncEngineEventType } from './sync-types';
import { syncGroupsAndStudentsBatch, syncGroupEnrollments, syncPaymentsBatch } from './sync-core-handlers';
import {
  syncAttendanceAndHomeworkBatch,
  syncProgressBatch,
  syncAssessmentsBatch,
  syncGenericMutations,
} from './sync-records-handlers';

export interface FlushExecutorContext {
  isOnline: () => boolean;
  isSyncConfirmationRequired: () => boolean;
  getQueryClient: () => any;
  notify: (type: SyncEngineEventType, data?: any) => void;
  setLastSyncedAt: (timestamp: number) => void;
  handleFailedMutation: (mutation: OutboxMutationRecord, errorMessage: string) => Promise<void>;
  setIsSyncingState: (syncing: boolean) => void;
}

export interface FlushOptions {
  mutationIds?: string[];
  force?: boolean;
}

export class SyncFlushExecutor {
  private activeSyncPromise: Promise<{ synced: number; failed: number }> | null = null;

  constructor(private ctx: FlushExecutorContext) {}

  public async flushOutbox(options?: FlushOptions): Promise<{ synced: number; failed: number }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.ctx.isOnline();
    if (!isOnline) {
      return { synced: 0, failed: 0 };
    }
    if (this.ctx.isSyncConfirmationRequired() && !options?.force) {
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

  public async executeFlush(options?: FlushOptions): Promise<{ synced: number; failed: number }> {
    // ── Pre-flight authentication guard ──────────────────────────────────────
    // Proactively refresh the access token before starting any network work so
    // that 401 errors don’t cascade across all outbox items and burn their retry
    // counters. The guard only activates when a refresh token is present in storage.
    const storedRefreshToken = getStoredRefreshToken();
    if (storedRefreshToken) {
      const accessToken = getStoredAccessToken();
      if (!accessToken || isAccessTokenExpiredOrExpiring()) {
        const fresh = await refreshAccessToken();
        if (!fresh) {
          return { synced: 0, failed: 0 };
        }
      }
    }

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
    const expiredMutations = pending.filter((m) => now - (m.clientTimestamp || 0) > SEVEN_DAYS_MS);
    for (const m of expiredMutations) {
      await this.ctx.handleFailedMutation(m, 'Mutation expired (TTL 7 days exceeded)');
    }
    pending = pending.filter((m) => now - (m.clientTimestamp || 0) <= SEVEN_DAYS_MS);

    // Filter out mutations that were recently attempted and failed (exponential backoff)
    const BASE_RETRY_DELAY_MS = 30_000;
    pending = pending.filter((m) => {
      if (m.status === 'FAILED' && m.lastAttemptAt) {
        const backoffMultiplier = Math.pow(2, Math.min(m.retryCount || 0, 6));
        const requiredDelay = BASE_RETRY_DELAY_MS * backoffMultiplier;
        return now - m.lastAttemptAt >= requiredDelay;
      }
      return true;
    });

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.ctx.setIsSyncingState(true);
    this.ctx.notify('SYNC_START', { pendingCount: pending.length });

    const qClient = this.ctx.getQueryClient();
    if (qClient) {
      qClient.cancelQueries();
    }

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Group and Student Creations
      const coreCtx = { handleFailedMutation: this.ctx.handleFailedMutation };
      const groupStudentRes = await syncGroupsAndStudentsBatch(pending, coreCtx);
      syncedCount += groupStudentRes.syncedCount;
      failedCount += groupStudentRes.failedCount;

      // 2. Group Enrollments
      const enrollmentsRes = await syncGroupEnrollments(pending, coreCtx);
      syncedCount += enrollmentsRes.syncedCount;
      failedCount += enrollmentsRes.failedCount;

      // 3. Attendance & Homework Batch
      const attHwRes = await syncAttendanceAndHomeworkBatch(pending, coreCtx);
      syncedCount += attHwRes.syncedCount;
      failedCount += attHwRes.failedCount;

      // 4. Payments Batch
      const paymentsRes = await syncPaymentsBatch(pending, coreCtx);
      syncedCount += paymentsRes.syncedCount;
      failedCount += paymentsRes.failedCount;

      // 5. Progress Batch
      const progressRes = await syncProgressBatch(pending, coreCtx);
      syncedCount += progressRes.syncedCount;
      failedCount += progressRes.failedCount;

      // 6. Assessments Batch
      const assessmentsRes = await syncAssessmentsBatch(pending, coreCtx);
      syncedCount += assessmentsRes.syncedCount;
      failedCount += assessmentsRes.failedCount;

      // 7. Generic FIFO mutations
      const groupCreations = pending.filter(
        (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.GROUPS.CREATE,
      );
      const studentCreations = pending.filter(
        (m) => m.domain === 'students' && m.method === 'POST' && m.endpoint === API_ENDPOINTS.STUDENTS.CREATE,
      );
      const groupEnrollments = pending.filter(
        (m) => m.domain === 'groups' && m.method === 'POST' && m.endpoint !== API_ENDPOINTS.GROUPS.CREATE,
      );
      const attendanceAndHomeworkItems = pending.filter(
        (m) =>
          m.type === 'RECORD_HOMEWORK_ONSITE' ||
          m.type === 'RECORD_ATTENDANCE' ||
          m.payload?.type === 'RECORD_HOMEWORK_ONSITE' ||
          m.payload?.type === 'RECORD_ATTENDANCE' ||
          m.endpoint?.includes('/sync/homework') ||
          (m.domain === 'attendance' && m.method === 'POST'),
      );
      const paymentItems = pending.filter((m) => m.domain === 'finance');
      const progressItems = pending.filter((m) => m.domain === 'progress' && m.method === 'POST');
      const assessmentItems = pending.filter((m) => m.domain === 'assessments' && m.method === 'POST');

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

      const genericRes = await syncGenericMutations(remainingGeneric, coreCtx);
      syncedCount += genericRes.syncedCount;
      failedCount += genericRes.failedCount;

      this.ctx.setLastSyncedAt(Date.now());
      if (syncedCount > 0) {
        toast.success(`تمت مزامنة ${syncedCount} من العمليات المحفوظة بنجاح 🚀`, {
          id: 'sync-success',
        });
      }
      this.ctx.notify('SYNC_SUCCESS', { syncedCount, failedCount });

      if (qClient) {
        qClient.invalidateQueries({ queryKey: ['groups'] });
        qClient.invalidateQueries({ queryKey: ['academic-groups'] });
        qClient.invalidateQueries({ queryKey: ['students'] });
        qClient.invalidateQueries({ queryKey: ['attendance'] });
        qClient.invalidateQueries({ queryKey: ['finance'] });
        qClient.invalidateQueries({ queryKey: ['payments'] });
        qClient.invalidateQueries({ queryKey: ['student-payments'] });
        qClient.invalidateQueries({ queryKey: ['group-defaulters'] });
        qClient.invalidateQueries({ queryKey: ['session-details'] });
        qClient.invalidateQueries({ queryKey: ['homework-records'] });
        qClient.invalidateQueries({ queryKey: ['attendance-records'] });
        qClient.invalidateQueries({ queryKey: ['student-group-sessions'] });
        if (typeof qClient.refetchQueries === 'function') {
          qClient.refetchQueries({ type: 'active' });
        }
      }

      if (syncedCount > 0) {
        try {
          await bootstrapManager.performBootstrap({ queryClient: qClient });
        } catch (pullErr) {
          console.warn('Downstream bootstrap sync error after outbox flush:', pullErr);
        }
      }
    } finally {
      this.ctx.setIsSyncingState(false);
    }

    return { synced: syncedCount, failed: failedCount };
  }
}
