import { GroupEntity, StudentEntity, IOfflineDatabase } from '../types';

export class GroupsRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryGroups() {
    return this.db.core.memoryGroups;
  }
  private get memoryStudents() {
    return this.db.core.memoryStudents;
  }
  private get memoryRosters() {
    return this.db.core.memoryRosters;
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
  private getRoster(groupId: string) {
    return this.db.getRoster(groupId);
  }
  private getStudentsOffline(options?: any) {
    return this.db.getStudentsOffline(options);
  }
  private getSchedulesOffline(groupId?: string) {
    return this.db.getSchedulesOffline(groupId);
  }
  private getSessionsOffline(filterOrGroupId?: any, dateStr?: string) {
    return this.db.getSessionsOffline(filterOrGroupId, dateStr);
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
      const existing: Partial<GroupEntity> = this.memoryGroups.get(g.id) || {};
      const mergedCount = g._count ?? existing._count;
      this.memoryGroups.set(g.id, {
        ...(existing as any),
        ...g,
        ...(mergedCount ? { _count: mergedCount } : {}),
        updatedAt: Date.now(),
      });
    });
    if (!this.isSupported() || groups.length === 0) return;
    try {
      const { store } = await this.getStore('groups', 'readwrite');
      for (const g of groups) {
        const existingRecord = await new Promise<GroupEntity | undefined>((resolve) => {
          const req = store.get(g.id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });
        const merged: GroupEntity = {
          ...(existingRecord || {}),
          ...g,
          _count: g._count ?? existingRecord?._count,
        };
        store.put(merged);
      }
    } catch {}
  }


  public async syncGroupsSnapshot(serverGroups: GroupEntity[]): Promise<void> {
    const pendingIds = await this.getPendingEntityIds();
    const serverGroupIds = new Set(serverGroups.map((g) => g.id));

    const allMemoryIds = Array.from(this.memoryGroups.keys());
    for (const memId of allMemoryIds) {
      if (!serverGroupIds.has(memId) && !pendingIds.has(memId)) {
        this.memoryGroups.delete(memId);
      }
    }
    for (const g of serverGroups) {
      if (!pendingIds.has(g.id)) {
        const existing = this.memoryGroups.get(g.id) || {};
        this.memoryGroups.set(g.id, { ...existing, ...g, updatedAt: Date.now() });
      }
    }

    if (!this.isSupported()) return;

    try {
      const { store } = await this.getStore('groups', 'readwrite');
      const allLocalGroups: GroupEntity[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      for (const localGroup of allLocalGroups) {
        if (!serverGroupIds.has(localGroup.id) && !pendingIds.has(localGroup.id)) {
          store.delete(localGroup.id);
        }
      }

      for (const g of serverGroups) {
        if (!pendingIds.has(g.id)) {
          store.put(g);
        }
      }
    } catch (e) {
      console.warn('Error during syncGroupsSnapshot:', e);
    }
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


  public async getGroupsOffline(options?: string | {
    academicYear?: string;
    academicTerm?: string;
    gradeLevel?: string;
    status?: string;
  }): Promise<GroupEntity[]> {
    const filter = typeof options === 'string' ? { academicYear: options } : options;
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

    // Reconcile group student counts from local students store if _count is missing or 0
    let studentRosterCounts: Map<string, number> | null = null;
    const groupsNeedingCount = list.some(
      (g) => !g._count || g._count.enrollments === undefined || g._count.enrollments === 0,
    );
    if (groupsNeedingCount) {
      try {
        let rawStudents: StudentEntity[] = [];
        if (!this.isSupported()) {
          rawStudents = Array.from(this.memoryStudents.values());
        } else {
          const { store } = await this.getStore('students', 'readonly');
          rawStudents = await new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || Array.from(this.memoryStudents.values()));
            req.onerror = () => resolve(Array.from(this.memoryStudents.values()));
          });
        }
        studentRosterCounts = new Map<string, number>();
        for (const s of rawStudents) {
          if (s.isArchived === true || (s.user && s.user.isActive === false) || s.isActive === false) continue;
          if (s.academicStatus && s.academicStatus !== 'ACTIVE') continue;

          const gid =
            s.groupId ||
            s.groupEnrollments?.[0]?.groupId ||
            s.groupEnrollments?.[0]?.group?.id;
          if (gid) {
            studentRosterCounts.set(gid, (studentRosterCounts.get(gid) || 0) + 1);
          }
        }
      } catch {}
    }

    return list
      .filter((g) => {
        // 1. Status and active check
        if (g.status && g.status === 'ARCHIVED') return false;
        if ((g as any).isArchived === true) return false;
        if ((g as any).isActive === false) return false;
        if (filter?.status && g.status && g.status !== filter.status) return false;

        // 2. Grade level
        if (filter?.gradeLevel && g.gradeLevel && g.gradeLevel !== filter.gradeLevel) return false;

        // 3. Academic Year & Term
        if (filter?.academicYear && g.academicYear && g.academicYear !== filter.academicYear) return false;
        if (filter?.academicTerm && g.academicTerm && g.academicTerm !== filter.academicTerm) return false;

        return true;
      })
      .map((g) => {
        if (studentRosterCounts && (!g._count || !g._count.enrollments)) {
          const calculated = studentRosterCounts.get(g.id) || 0;
          if (calculated > 0) {
            return {
              ...g,
              _count: {
                ...(g._count || {}),
                enrollments: calculated,
              },
            };
          }
        }
        return g;
      });
  }

  /**
   * Reconciles temporary client UUIDs with authoritative server IDs and codes
   * across groups, students, payments, and offline rosters.
   */

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
}
