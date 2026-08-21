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

export type SyncEngineEventListener = (event: {
  type: 'ONLINE' | 'OFFLINE' | 'SYNC_START' | 'SYNC_SUCCESS' | 'SYNC_ERROR' | 'MUTATION_ENQUEUED';
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

  private notify(
    type: 'ONLINE' | 'OFFLINE' | 'SYNC_START' | 'SYNC_SUCCESS' | 'SYNC_ERROR' | 'MUTATION_ENQUEUED',
    data?: any,
  ) {
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

  private async handleNetworkChange(online: boolean) {
    if (online) {
      // Confirm genuine connectivity via fast ping
      const verified = await this.verifyConnection();
      this.isOnlineState = verified;
      if (verified) {
        this.notify('ONLINE');
        this.triggerSync();
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

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Flush Group Creations first
      const groupCreations = pending.filter((m) => m.domain === 'groups' && m.method === 'POST');
      for (const item of groupCreations) {
        try {
          await offlineDb.updateMutationStatus(item.id, 'SYNCING');
          const res = await apiClient<any>(item.endpoint, {
            method: item.method,
            body: item.payload ? JSON.stringify(item.payload) : undefined,
          });
          if (res?.id && item.optimisticId && res.id !== item.optimisticId) {
            // Update local store with server assigned id if mapped
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

      // 2. Flush Student Creations
      const studentCreations = pending.filter((m) => m.domain === 'students' && m.method === 'POST');
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

      // 3. Batch Attendance Sync
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

      // 4. Batch Payments Sync
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

      // 5. Batch Progress Sync
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

      // 6. Batch Assessments Sync
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

      // 7. Generic / Remaining mutations (Sequential FIFO)
      const remainingGeneric = pending.filter(
        (m) =>
          !groupCreations.includes(m) &&
          !studentCreations.includes(m) &&
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

  private async handleFailedMutation(mutation: OutboxMutationRecord, errorMessage: string) {
    if (mutation.retryCount >= 5) {
      await offlineDb.recordConflict({
        id: generateClientOperationId(),
        operationId: mutation.id,
        domain: mutation.domain,
        reason: `Exceeded max retry attempts (5): ${errorMessage}`,
        payload: mutation.payload,
        timestamp: Date.now(),
        resolved: false,
      });
      await offlineDb.removeMutation(mutation.id);
    } else {
      await offlineDb.updateMutationStatus(mutation.id, 'FAILED', errorMessage);
    }
  }
}

export const syncEngine = new OfflineSyncEngine();
