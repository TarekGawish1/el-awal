import { SessionEntity, ScheduleEntity, GroupEntity, IOfflineDatabase } from '../types';

export class SessionsSchedulesRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memorySessions() {
    return this.db.core.memorySessions;
  }
  private get memorySchedules() {
    return this.db.core.memorySchedules;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getPendingEntityIds() {
    return this.db.getPendingEntityIds();
  }
  private clearRosters() {
    return this.db.clearRosters();
  }
  private getGroupsOffline(options?: any) {
    return this.db.getGroupsOffline(options);
  }

  public async bulkPutSessions(sessions: SessionEntity[]): Promise<void> {
    const pendingIds = await this.getPendingEntityIds();
    sessions.forEach((s) => {
      if (!pendingIds.has(s.id)) this.memorySessions.set(s.id, s);
    });
    if (!this.isSupported() || sessions.length === 0) return;
    try {
      const { store } = await this.getStore('sessions', 'readwrite');
      for (const s of sessions) {
        if (!pendingIds.has(s.id)) store.put(s);
      }
    } catch {}
  }


  public async syncSessionsSnapshot(
    serverSessions: SessionEntity[],
    scope?: { academicYear?: string; academicTerm?: string; groupId?: string },
  ): Promise<void> {
    const pendingIds = await this.getPendingEntityIds();
    const serverSessionIds = new Set(serverSessions.map((s) => s.id));

    // Get group mapping if scoped by academic period
    const groupMap = new Map<string, GroupEntity>();
    if (scope?.academicYear || scope?.academicTerm) {
      const allGroups = await this.getGroupsOffline();
      allGroups.forEach((g) => groupMap.set(g.id, g));
    }

    const isSessionInScope = (s: SessionEntity): boolean => {
      if (!scope) return true;
      if (scope.groupId && scope.groupId !== 'ALL' && s.groupId !== scope.groupId) return false;
      if (scope.academicYear || scope.academicTerm) {
        const g = (s.group as any) || groupMap.get(s.groupId);
        if (scope.academicYear && scope.academicYear !== 'ALL' && g?.academicYear && g.academicYear !== scope.academicYear) {
          return false;
        }
        if (scope.academicTerm && scope.academicTerm !== 'ALL' && g?.academicTerm && g.academicTerm !== scope.academicTerm) {
          return false;
        }
      }
      return true;
    };

    // 1. Memory reconciliation
    for (const [memId, memSession] of Array.from(this.memorySessions.entries())) {
      if (isSessionInScope(memSession) && !serverSessionIds.has(memId) && !pendingIds.has(memId)) {
        this.memorySessions.delete(memId);
      }
    }
    for (const s of serverSessions) {
      if (!pendingIds.has(s.id)) {
        const existing = this.memorySessions.get(s.id) || {};
        this.memorySessions.set(s.id, { ...existing, ...s });
      }
    }

    if (!this.isSupported()) return;

    // 2. IndexedDB store reconciliation
    try {
      const { store } = await this.getStore('sessions', 'readwrite');
      const allLocalSessions: SessionEntity[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      for (const localSession of allLocalSessions) {
        if (
          isSessionInScope(localSession) &&
          !serverSessionIds.has(localSession.id) &&
          !pendingIds.has(localSession.id)
        ) {
          store.delete(localSession.id);
        }
      }

      for (const s of serverSessions) {
        if (!pendingIds.has(s.id)) {
          store.put(s);
        }
      }
    } catch (e) {
      console.warn('Error during syncSessionsSnapshot:', e);
    }
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


  public async getSchedulesOffline(groupId?: string): Promise<ScheduleEntity[]> {
    if (!(await this.db.isUserAuthorizedForOfflineData())) {
      return [];
    }

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


  public async getSessionsOffline(
    filterOrGroupId?:
      | string
      | {
          groupId?: string;
          dateStr?: string;
          academicYear?: string;
          academicTerm?: string;
        },
    dateStr?: string,
  ): Promise<SessionEntity[]> {
    if (!(await this.db.isUserAuthorizedForOfflineData())) {
      return [];
    }

    let groupId: string | undefined;
    let effectiveDateStr: string | undefined = dateStr;
    let academicYear: string | undefined;
    let academicTerm: string | undefined;

    if (typeof filterOrGroupId === 'object' && filterOrGroupId !== null) {
      groupId = filterOrGroupId.groupId;
      effectiveDateStr = filterOrGroupId.dateStr || dateStr;
      academicYear = filterOrGroupId.academicYear;
      academicTerm = filterOrGroupId.academicTerm;
    } else {
      groupId = filterOrGroupId;
    }

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

    // Build group lookup if academicYear or academicTerm filter is specified
    const groupMap = new Map<string, GroupEntity>();
    if (academicYear || academicTerm) {
      const allGroups = await this.getGroupsOffline();
      allGroups.forEach((g) => groupMap.set(g.id, g));
    }

    const filtered = list.filter((s) => {
      if (groupId && groupId !== 'ALL' && s.groupId !== groupId) return false;
      if (effectiveDateStr && !s.sessionDate.startsWith(effectiveDateStr)) return false;

      if (academicYear || academicTerm) {
        const g = (s.group as any) || groupMap.get(s.groupId);
        if (academicYear && academicYear !== 'ALL' && g?.academicYear && g.academicYear !== academicYear) {
          return false;
        }
        if (academicTerm && academicTerm !== 'ALL' && g?.academicTerm && g.academicTerm !== academicTerm) {
          return false;
        }
      }

      return true;
    });

    // Chronological sorting: earliest session date and start time first
    return filtered.sort((a, b) => {
      const dateA = a.sessionDate.includes('T') ? a.sessionDate.split('T')[0] : a.sessionDate;
      const dateB = b.sessionDate.includes('T') ? b.sessionDate.split('T')[0] : b.sessionDate;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }

  public async getSessionByIdOffline(id: string): Promise<SessionEntity | null> {
    const sessions = await this.getSessionsOffline();
    return sessions.find((s) => s.id === id) || null;
  }
}
