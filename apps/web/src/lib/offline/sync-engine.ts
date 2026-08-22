/**
 * Robust Client Synchronization Engine for El Awal Platform
 * Handles network lifecycle, outbox queue flushing, optimistic retries,
 * domain topological ordering, and conflict recording.
 */

import { offlineDb, OutboxMutationRecord, MutationStatus } from './db';
import { API_BASE_URL, API_ENDPOINTS } from '../api/endpoints';
import { apiClient } from '../api/client';
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

export type SyncEngineEventType =
  | 'ONLINE'
  | 'OFFLINE'
  | 'SYNC_START'
  | 'SYNC_PROGRESS'
  | 'SYNC_SUCCESS'
  | 'SYNC_ERROR'
  | 'MUTATION_ENQUEUED'
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
  private listeners: Set<SyncEngineEventListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncedAt: number | null = null;
  private queryClient: any = null;

  public setQueryClient(client: any): void {
    this.queryClient = client;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic check every 30 seconds
      setInterval(() => {
        if (navigator.onLine && !this.isSyncingState) {
          this.checkAndSync();
        }
      }, 30000);
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
   * Fetches remote delta diff summary from GET /api/v1/sync/diff
   */
  public async getSyncDiff(since?: number): Promise<IncomingDiffSummary> {
    const timestamp = since || this.lastSyncedAt || Date.now() - 24 * 60 * 60 * 1000;
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

  private async handleNetworkChange(online: boolean) {
    if (online) {
      // Confirm genuine connectivity via fast ping
      const verified = await this.verifyConnection();
      this.isOnlineState = verified;
      if (verified) {
        this.notify('ONLINE');
        const pendingCount = await offlineDb.getPendingCount();
        if (!this.isAutoSyncEnabled() && pendingCount > 0) {
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
      return true; // Fallback to navigator.onLine if ping endpoint not deployed yet
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
    };

    await offlineDb.enqueueMutation(mutation);
    this.notify('MUTATION_ENQUEUED', mutation);

    if (this.isOnlineState && !this.isSyncingState) {
      this.triggerSync();
    }

    return id;
  }

  public triggerSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.flushOutbox();
    }, 300);
  }

  private async checkAndSync() {
    const pendingCount = await offlineDb.getPendingCount();
    if (pendingCount > 0) {
      this.flushOutbox();
    }
  }

  /**
   * Main Outbox Flush Engine:
   * Topological ordering:
   * 1. Entity Creations (groups -> students -> schedules)
   * 2. Domain Batch Endpoints (attendance -> finance -> progress -> assessments)
   * 3. Remaining Generic FIFO mutations
   */
  public async flushOutbox(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncingState) {
      return { synced: 0, failed: 0 };
    }

    const pending = await offlineDb.getPendingMutations();
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

      // 4. Batch Attendance Sync
      const attendanceItems = pending.filter((m) => m.domain === 'attendance' && m.method === 'POST');
      if (attendanceItems.length > 0) {
        try {
          const operations = attendanceItems.map((item) => ({
            id: item.id,
            sessionId: item.payload.sessionId,
            qrCodeToken: item.payload.qrCodeToken,
            studentId: item.payload.studentId,
            status: item.payload.status || 'PRESENT',
            recordingMethod: item.payload.recordingMethod || 'QR_SCAN',
            clientTimestamp: item.clientTimestamp,
            allowCrossGroup: item.payload.allowCrossGroup,
            notes: item.payload.notes,
          }));

          const res = await apiClient<any>(API_ENDPOINTS.SYNC.ATTENDANCE, {
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
                domain: 'attendance',
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
          console.error('Batch attendance sync failed:', err);
          for (const item of attendanceItems) {
            await this.handleFailedMutation(item, err.message);
            failedCount++;
          }
        }
      }

      // 5. Batch Payments Sync
      const paymentItems = pending.filter((m) => m.domain === 'finance' && m.method === 'POST');
      if (paymentItems.length > 0) {
        try {
          const operations = paymentItems.map((item) => ({
            id: item.id,
            studentId: item.payload.studentId,
            groupId: item.payload.groupId,
            periodYear: item.payload.periodYear,
            periodMonth: item.payload.periodMonth,
            amountPaid: item.payload.amountPaid,
            amountExpected: item.payload.amountExpected,
            paymentMethod: item.payload.paymentMethod || 'CASH',
            receiptNumber: item.payload.receiptNumber,
            notes: item.payload.notes,
            clientTimestamp: item.clientTimestamp,
          }));

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
          !attendanceItems.includes(m) &&
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

      this.lastSyncedAt = Date.now();
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
      }

      // 8. Downstream Pull: Fetch updated server snapshot and merge into IndexedDB + TanStack Query cache
      try {
        await bootstrapManager.performBootstrap({ queryClient: this.queryClient });
      } catch (pullErr) {
        console.warn('Downstream bootstrap sync error after outbox flush:', pullErr);
      }
    } finally {
      this.isSyncingState = false;
    }

    return { synced: syncedCount, failed: failedCount };
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
    const pushResult = await this.flushOutbox();

    onProgress?.(70, 'تحديث المعرفات ومطابقة السجلات...');
    this.notify('SYNC_PROGRESS', { progress: 70, step: 'RECONCILING' });

    onProgress?.(85, 'تحميل التحديثات من الخادم وتحديث التخزين المحلي...');
    this.notify('SYNC_PROGRESS', { progress: 85, step: 'PULLING_DIFF' });
    try {
      await bootstrapManager.performBootstrap({ queryClient: this.queryClient });
    } catch (e) {
      console.warn('Bootstrap refresh error during bidirectional sync:', e);
    }

    onProgress?.(100, 'اكتملت المزامنة بنجاح 🎉');
    this.notify('SYNC_PROGRESS', { progress: 100, step: 'COMPLETE' });

    return pushResult;
  }

  private async handleFailedMutation(mutation: OutboxMutationRecord, errorMessage: string) {
    const isValidationError =
      errorMessage?.includes('already registered') ||
      errorMessage?.includes('Collision') ||
      errorMessage?.includes('400') ||
      errorMessage?.includes('409') ||
      errorMessage?.includes('422') ||
      errorMessage?.includes('تكرار') ||
      errorMessage?.includes('مسجل مسبقاً');

    if (mutation.retryCount >= 3 || isValidationError) {
      await offlineDb.recordConflict({
        id: generateClientOperationId(),
        operationId: mutation.id,
        domain: mutation.domain,
        reason: isValidationError
          ? `تعذر إتمام العملية على الخادم: ${errorMessage}`
          : `تجاوز الحد الأقصى للمحاولات (3): ${errorMessage}`,
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
    }
  }
}

export const syncEngine = new OfflineSyncEngine();
