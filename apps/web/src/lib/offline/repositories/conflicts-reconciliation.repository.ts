import { SyncConflictRecord, StudentEntity, IOfflineDatabase } from '../types';

export class ConflictsReconciliationRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryConflicts() {
    return this.db.core.memoryConflicts;
  }
  private get memoryGroups() {
    return this.db.core.memoryGroups;
  }
  private get memoryStudents() {
    return this.db.core.memoryStudents;
  }
  private get memoryPayments() {
    return this.db.core.memoryPayments;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getGroupByIdOffline(id: string | number) {
    return this.db.getGroupByIdOffline(id);
  }
  private removeGroup(id: string) {
    return this.db.removeGroup(id);
  }
  private bulkPutGroups(groups: any[]) {
    return this.db.bulkPutGroups(groups);
  }
  private getRoster(groupId: string) {
    return this.db.getRoster(groupId);
  }
  private cacheRoster(roster: any) {
    return this.db.cacheRoster(roster);
  }
  private getStudentByIdOffline(id: string | number) {
    return this.db.getStudentByIdOffline(id);
  }
  private removeStudent(id: string) {
    return this.db.removeStudent(id);
  }
  private bulkPutStudents(students: StudentEntity[]) {
    return this.db.bulkPutStudents(students);
  }

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
}
