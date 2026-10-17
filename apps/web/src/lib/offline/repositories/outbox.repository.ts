import { OutboxMutationRecord, MutationStatus, IOfflineDatabase } from '../types';

export class OutboxRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryOutbox() {
    return this.db.core.memoryOutbox;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }

  public async getPendingEntityIds(): Promise<Set<string>> {
    const pendingMutations = await this.getPendingMutations();
    const pendingIds = new Set<string>();
    for (const m of pendingMutations) {
      if (m.optimisticId) pendingIds.add(m.optimisticId);
      if (m.payload?.id) pendingIds.add(String(m.payload.id));
      if (m.payload?.studentId) pendingIds.add(String(m.payload.studentId));
      if (m.payload?.groupId) pendingIds.add(String(m.payload.groupId));
      if (m.payload?.sessionId) pendingIds.add(String(m.payload.sessionId));
      if (m.payload?.assessmentId) pendingIds.add(String(m.payload.assessmentId));
      if (m.payload?.bookletId) pendingIds.add(String(m.payload.bookletId));
    }
    return pendingIds;
  }

  public async enqueueMutation(mutation: OutboxMutationRecord): Promise<void> {
    const { useAuthStore } = await import('@/features/auth/store/auth.store');
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) {
      console.error('CRITICAL: Attempted to enqueue offline mutation without an authenticated user.', mutation);
      throw new Error('Authentication required to save offline changes.');
    } else {
      mutation.userId = currentUser.id;
    }

    const allowedDomains = ['attendance', 'finance', 'progress', 'students', 'groups', 'assessments', 'generic'];
    if (!allowedDomains.includes(mutation.domain)) {
      throw new Error(`العمليات على (${mutation.domain}) غير مدعومة في وضع عدم الاتصال. يرجى الاتصال بالإنترنت.`);
    }

    this.memoryOutbox.set(mutation.id, { ...mutation });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      store.put(mutation);
    } catch (e) {
      console.error('CRITICAL: Failed to persist outbox mutation to IndexedDB:', mutation.id, e);
    }
  }


  public async getPendingMutations(userId?: string): Promise<OutboxMutationRecord[]> {
    if (!this.isSupported()) {
      const all = Array.from(this.memoryOutbox.values());
      return all
        .filter((m) => (m.status === 'PENDING' || m.status === 'FAILED') && (userId === undefined || m.userId === userId))
        .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    }
    try {
      const { store } = await this.getStore('outbox_mutations', 'readonly');
      return new Promise((resolve) => {
        let req: IDBRequest;
        if (userId) {
          const index = store.index('idx_userId');
          req = index.getAll(IDBKeyRange.only(userId));
        } else {
          req = store.getAll();
        }
        
        req.onsuccess = () => {
          const all = (req.result || []) as OutboxMutationRecord[];
          const pending = all
            .filter((m) => m.status === 'PENDING' || m.status === 'FAILED')
            .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
          resolve(pending);
        };
        req.onerror = () => {
          const all = Array.from(this.memoryOutbox.values());
          resolve(all.filter((m) => (m.status === 'PENDING' || m.status === 'FAILED') && (userId === undefined || m.userId === userId)));
        };
      });
    } catch {
      const all = Array.from(this.memoryOutbox.values());
      return all.filter((m) => (m.status === 'PENDING' || m.status === 'FAILED') && (userId === undefined || m.userId === userId));
    }
  }


  public async recoverOrphanedSyncingMutations(userId?: string): Promise<void> {
    const now = Date.now();
    for (const mem of this.memoryOutbox.values()) {
      if ((!userId || mem.userId === userId) && mem.status === 'SYNCING') {
        if (!mem.lastAttemptAt || (now - mem.lastAttemptAt) > 120000) {
          mem.status = 'FAILED';
          mem.lastError = 'Recovered from orphaned SYNCING state';
        }
      }
    }
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      const all: OutboxMutationRecord[] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const now = Date.now();
      for (const m of all) {
        if ((!userId || m.userId === userId) && m.status === 'SYNCING') {
          // If stuck for more than 2 minutes
          if (!m.lastAttemptAt || (now - m.lastAttemptAt) > 120000) {
            m.status = 'FAILED';
            m.lastError = 'Recovered from orphaned SYNCING state';
            store.put(m);
            const mem = this.memoryOutbox.get(m.id);
            if (mem) {
              mem.status = 'FAILED';
              mem.lastError = 'Recovered from orphaned SYNCING state';
              this.memoryOutbox.set(m.id, mem);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to recover orphaned syncing mutations', e);
    }
  }


  public async claimUnassociatedMutations(userId: string): Promise<number> {
    if (!userId) return 0;
    let claimedCount = 0;

    for (const [, mem] of this.memoryOutbox.entries()) {
      if (!mem.userId) {
        mem.userId = userId;
        claimedCount++;
      }
    }

    if (!this.isSupported()) return claimedCount;

    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      const all: OutboxMutationRecord[] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const m of all) {
        if (!m.userId) {
          m.userId = userId;
          store.put(m);
          claimedCount++;
        }
      }
    } catch (e) {
      console.warn('Failed to claim unassociated mutations in IndexedDB:', e);
    }

    return claimedCount;
  }


  public async updateMutationStatus(
    id: string,
    status: MutationStatus,
    error?: string,
  ): Promise<void> {
    const now = Date.now();
    const mem = this.memoryOutbox.get(id);
    if (mem) {
      mem.status = status;
      if (error) mem.lastError = error;
      if (status === 'FAILED') mem.retryCount = (mem.retryCount || 0) + 1;
      if (status === 'SYNCING' || status === 'FAILED') mem.lastAttemptAt = now;
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
        if (status === 'SYNCING' || status === 'FAILED') record.lastAttemptAt = now;
        store.put(record);
      };
    } catch (e) {
      console.warn('Failed to update mutation status in IndexedDB:', id, status, e);
    }
  }

  /**
   * Resets a single outbox mutation back to PENDING with retryCount = 0.
   * Used by the "Retry All" action in SyncConflictsModal when auth failures
   * have burned retry slots that should not count against the mutation.
   */

  public async resetMutationForRetry(id: string): Promise<void> {
    const mem = this.memoryOutbox.get(id);
    if (mem) {
      mem.status = 'PENDING';
      mem.retryCount = 0;
      mem.lastError = undefined;
      this.memoryOutbox.set(id, mem);
    }
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as OutboxMutationRecord;
        if (!record) return;
        record.status = 'PENDING';
        record.retryCount = 0;
        record.lastError = undefined;
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


  public async getUserPendingCount(userId: string): Promise<number> {
    if (!this.isSupported()) {
      let count = 0;
      for (const m of this.memoryOutbox.values()) {
        if (m.userId === userId && (m.status === 'PENDING' || m.status === 'FAILED')) count++;
      }
      return count;
    }
    try {
      const { store } = await this.getStore('outbox_mutations', 'readonly');
      const index = store.index('idx_userId');
      return new Promise((resolve) => {
        const req = index.count(IDBKeyRange.only(userId));
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => {
          let count = 0;
          for (const m of this.memoryOutbox.values()) {
            if (m.userId === userId && (m.status === 'PENDING' || m.status === 'FAILED')) count++;
          }
          resolve(count);
        };
      });
    } catch {
      let count = 0;
      for (const m of this.memoryOutbox.values()) {
        if (m.userId === userId && (m.status === 'PENDING' || m.status === 'FAILED')) count++;
      }
      return count;
    }
  }


  public async clearUserPendingMutations(userId: string): Promise<number> {
    let deletedCount = 0;
    // Clear memory outbox first
    for (const [id, m] of this.memoryOutbox.entries()) {
      if (m.userId === userId) {
        this.memoryOutbox.delete(id);
        deletedCount++;
      }
    }

    if (!this.isSupported()) return deletedCount;
    
    try {
      const { store } = await this.getStore('outbox_mutations', 'readwrite');
      const index = store.index('idx_userId');
      return new Promise((resolve, reject) => {
        const req = index.openCursor(IDBKeyRange.only(userId));
        let dbDeletedCount = 0;
        req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            cursor.delete();
            dbDeletedCount++;
            cursor.continue();
          } else {
            resolve(dbDeletedCount > 0 ? dbDeletedCount : deletedCount);
          }
        };
        req.onerror = () => reject(new Error('Failed to delete user mutations'));
      });
    } catch (e) {
      throw new Error('Failed to open database for deletion: ' + String(e));
    }
  }

  // ==========================================
  // Offline Roster Operations
  // ==========================================

}
