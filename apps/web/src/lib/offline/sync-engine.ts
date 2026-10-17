/**
 * Robust Client Synchronization Engine for El Awal Platform
 * Facade coordinating network lifecycle, outbox queue flushing, optimistic retries,
 * domain topological ordering, and conflict recording.
 */

import { offlineDb, OutboxMutationRecord } from './db';
import { API_BASE_URL } from '../api/endpoints';
import { getStoredAccessToken, getStoredRefreshToken } from '@/features/auth/utils/auth-tokens';
import { bootstrapManager } from './bootstrap-manager';
import {
  generateClientOperationId,
  SyncEngineEventType,
  SyncEngineEventListener,
  OutgoingStudentSummary,
  OutgoingGroupSummary,
  OutboxSummary,
  IncomingDiffSummary,
  PendingActivityKind,
  PendingActivityItem,
} from './sync/sync-types';
import { SyncActivitySummarizer } from './sync/sync-activity-summarizer';
import { SyncConflictResolver } from './sync/sync-conflict-resolver';
import { SyncFlushExecutor, FlushOptions } from './sync/sync-flush-executor';

export type {
  OutgoingStudentSummary,
  OutgoingGroupSummary,
  OutboxSummary,
  IncomingDiffSummary,
  PendingActivityKind,
  PendingActivityItem,
  SyncEngineEventType,
  SyncEngineEventListener,
};
export { generateClientOperationId };

export class OfflineSyncEngine {
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncingState: boolean = false;
  private listeners: Set<SyncEngineEventListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncedAt: number | null = null;
  private queryClient: any = null;
  private syncConfirmationRequired: boolean = false;
  private lastPingAt: number = 0;
  private lastPingOk: boolean = true;

  private summarizer: SyncActivitySummarizer;
  private conflictResolver: SyncConflictResolver;
  private flushExecutor: SyncFlushExecutor;

  constructor() {
    this.summarizer = new SyncActivitySummarizer();

    const self = this;
    this.conflictResolver = new SyncConflictResolver({
      get queryClient() {
        return self.queryClient;
      },
      notify: (type, data) => self.notify(type, data),
      triggerSync: () => self.triggerSync(),
      enqueue: (domain, endpoint, method, payload) => self.enqueue(domain, endpoint, method, payload),
      setSyncConfirmationRequired: (req) => {
        self.syncConfirmationRequired = req;
      },
    });

    this.flushExecutor = new SyncFlushExecutor({
      isOnline: () => self.isOnline(),
      isSyncConfirmationRequired: () => self.syncConfirmationRequired,
      getQueryClient: () => self.queryClient,
      notify: (type, data) => self.notify(type, data),
      setLastSyncedAt: (ts) => self.setLastSyncedAt(ts),
      handleFailedMutation: (m, err) => self.handleFailedMutation(m, err),
      setIsSyncingState: (syncing) => {
        self.isSyncingState = syncing;
      },
    });

    if (typeof window !== 'undefined') {
      offlineDb
        .getMetadata<number>('lastSyncedTimestamp')
        .then((ts) => {
          if (ts) this.lastSyncedAt = ts;
        })
        .catch(() => {});

      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Auto-sync on window focus or tab visibility
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

      // Periodic check and downstream pull every 60 seconds
      setInterval(() => {
        if (navigator.onLine && !this.isSyncingState && !bootstrapManager.isBootstrapping()) {
          this.checkAndSync();
        }
      }, 60000);
    }
  }

  public setQueryClient(client: any): void {
    this.queryClient = client;
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const hasSession = Boolean(getStoredAccessToken() || getStoredRefreshToken());
      if (!hasSession) return;
      setTimeout(() => {
        this.checkAndSync({ skipCooldown: false });
      }, 3000);
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

  public isSyncConfirmationRequired(): boolean {
    return this.syncConfirmationRequired;
  }

  public async getSyncDiff(since?: number, fallbackLastSynced?: number | null): Promise<IncomingDiffSummary> {
    return this.summarizer.getSyncDiff(since, fallbackLastSynced ?? this.lastSyncedAt);
  }

  public async getPendingOutboxSummary(): Promise<OutboxSummary> {
    return this.summarizer.getPendingOutboxSummary();
  }

  public async getDetailedPendingActivity(): Promise<PendingActivityItem[]> {
    return this.summarizer.getDetailedPendingActivity();
  }

  private async handleNetworkChange(online: boolean) {
    if (online) {
      const verified = await this.verifyConnection();
      this.isOnlineState = verified;
      if (verified) {
        this.notify('ONLINE');
        const pendingCount = await offlineDb.getPendingCount();
        if (pendingCount > 0) {
          this.syncConfirmationRequired = true;
          this.notify('SYNC_REVIEW_REQUIRED', { pendingCount });
        } else {
          this.syncConfirmationRequired = false;
          this.checkAndSync({ skipCooldown: true });
        }
      } else {
        this.notify('OFFLINE');
      }
    } else {
      this.isOnlineState = false;
      this.notify('OFFLINE');
    }
  }

  public async verifyConnection(force = false): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    const now = Date.now();
    if (!force && this.lastPingOk && now - this.lastPingAt < 30000) {
      return true;
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
      this.lastPingAt = now;
      this.lastPingOk = res.ok;
      return res.ok;
    } catch {
      this.lastPingAt = now;
      this.lastPingOk = false;
      return typeof navigator !== 'undefined' ? navigator.onLine : false;
    }
  }

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
    const allowedDomains = ['attendance', 'finance', 'progress', 'students', 'groups', 'assessments', 'generic'];
    if (!allowedDomains.includes(domain)) {
      throw new Error(`العمليات على (${domain}) غير مدعومة في وضع عدم الاتصال. يرجى الاتصال بالإنترنت.`);
    }

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
    if (this.syncConfirmationRequired) return;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.flushOutbox();
    }, 300);
  }

  public async checkAndSync(options?: { skipCooldown?: boolean }) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineState;
    if (!isOnline) return;

    if (typeof window !== 'undefined') {
      const hasSession = Boolean(getStoredAccessToken() || getStoredRefreshToken());
      if (!hasSession) return;
    }

    const verified = await this.verifyConnection();
    if (verified) {
      await this.flushOutbox();

      if (this.isAutoSyncEnabled() && !bootstrapManager.isBootstrapping()) {
        try {
          await bootstrapManager.performBootstrap({
            queryClient: this.queryClient,
            skipCooldown: options?.skipCooldown,
          });
        } catch (err) {
          console.warn('Background auto-pull downstream sync error:', err);
        }
      }
    }
  }

  public async flushOutbox(options?: FlushOptions): Promise<{ synced: number; failed: number }> {
    return this.flushExecutor.flushOutbox(options);
  }

  public async executeFlush(options?: FlushOptions): Promise<{ synced: number; failed: number }> {
    return this.flushExecutor.executeFlush(options);
  }

  public async confirmAndSync(selectedMutationIds?: string[]): Promise<{ synced: number; failed: number }> {
    this.syncConfirmationRequired = false;
    return this.flushOutbox({ mutationIds: selectedMutationIds, force: true });
  }

  public async retryConflicts(conflictIds?: string[]): Promise<number> {
    return this.conflictResolver.retryConflicts(conflictIds);
  }

  public async resetFailedMutations(): Promise<number> {
    return this.conflictResolver.resetFailedMutations();
  }

  public deferSyncConfirmation(): void {
    this.notify('SYNC_REVIEW_REQUIRED');
  }

  public async undoMutation(mutationId: string): Promise<void> {
    return this.conflictResolver.undoMutation(mutationId);
  }

  public async discardAllLocalChanges(): Promise<{ discardedCount: number }> {
    return this.conflictResolver.discardAllLocalChanges();
  }

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

  public isAuthError(errorMessage: string): boolean {
    return this.conflictResolver.isAuthError(errorMessage);
  }

  public isAuthConflictReason(reason: string): boolean {
    return this.conflictResolver.isAuthConflictReason(reason);
  }

  public async handleFailedMutation(mutation: OutboxMutationRecord, errorMessage: string): Promise<void> {
    return this.conflictResolver.handleFailedMutation(mutation, errorMessage);
  }
}

export const syncEngine = new OfflineSyncEngine();
