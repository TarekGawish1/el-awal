import { OfflineRosterRecord, IOfflineDatabase } from '../types';

export class RostersReportsRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryRosters() {
    return this.db.core.memoryRosters;
  }
  private get memoryReports() {
    return this.db.core.memoryReports;
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
  private getStudentsOffline(options?: any) {
    return this.db.getStudentsOffline(options);
  }

  public async cacheRoster(roster: OfflineRosterRecord): Promise<void> {
    this.memoryRosters.set(roster.groupId, { ...roster });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readwrite');
      store.put(roster);
    } catch {}
  }


  public async getRoster(groupId: string): Promise<OfflineRosterRecord | null> {
    if (!(await this.db.isUserAuthorizedForOfflineData())) {
      return null;
    }

    const buildFromStudents = async () => {
      const group = await this.getGroupByIdOffline(groupId);
      if (!group) return null;
      const students = await this.getStudentsOffline({ groupId });
      return {
        groupId,
        groupName: group.name,
        gradeLevel: group.gradeLevel,
        monthlyFee: group.monthlyFee,
        students: students.map(s => ({
          id: s.id,
          fullName: s.fullName || s.user?.fullName || '',
          studentCode: s.studentCode,
          qrCodeToken: s.qrCodeToken || s.id,
          gradeLevel: s.gradeLevel || group.gradeLevel,
          emergencyPhone: s.emergencyPhone || s.parentPhone || s.phone || '',
          parentPhone: s.parentPhone || '',
          academicStatus: s.academicStatus || 'ACTIVE'
        })),
        updatedAt: Date.now()
      };
    };

    if (!this.isSupported()) {
      return this.memoryRosters.get(groupId) || await buildFromStudents();
    }
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(groupId);
        req.onsuccess = async () => resolve(req.result || this.memoryRosters.get(groupId) || await buildFromStudents());
        req.onerror = async () => resolve(this.memoryRosters.get(groupId) || await buildFromStudents());
      });
    } catch {
      return this.memoryRosters.get(groupId) || await buildFromStudents();
    }
  }


  public async getAllCachedRosters(): Promise<OfflineRosterRecord[]> {
    if (!(await this.db.isUserAuthorizedForOfflineData())) {
      return [];
    }

    // Note: this only returns explicitly cached rosters.
    // Dynamic rosters built on-the-fly via getRoster are not returned here,
    // which is fine since this is only used as a fallback lookup.
    if (!this.isSupported()) {
      return Array.from(this.memoryRosters.values());
    }
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || Array.from(this.memoryRosters.values()));
        req.onerror = () => resolve(Array.from(this.memoryRosters.values()));
      });
    } catch {
      return Array.from(this.memoryRosters.values());
    }
  }


  public async clearRosters(): Promise<void> {
    this.memoryRosters.clear();
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_roster_cache', 'readwrite');
      store.clear();
    } catch {}
  }


  public async cacheSessionReport(sessionId: string, report: any): Promise<void> {
    const cleanId = String(sessionId).trim().toLowerCase();
    this.memoryReports.set(cleanId, { ...report });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('cached_queries', 'readwrite');
      store.put({
        cacheKey: `session_report_${cleanId}`,
        queryKey: `session_report_${cleanId}`,
        data: report,
        updatedAt: Date.now(),
      });
    } catch {}
  }


  public async getSessionReport(sessionId: string): Promise<any | null> {
    const cleanId = String(sessionId).trim().toLowerCase();
    let report: any = null;
    if (!this.isSupported()) {
      report = this.memoryReports.get(cleanId) || null;
    } else {
      try {
        const { store } = await this.getStore('cached_queries', 'readonly');
        report = await new Promise((resolve) => {
          const req = store.get(`session_report_${cleanId}`);
          req.onsuccess = () => resolve(req.result?.data || this.memoryReports.get(cleanId) || null);
          req.onerror = () => resolve(this.memoryReports.get(cleanId) || null);
        });
      } catch {
        report = this.memoryReports.get(cleanId) || null;
      }
    }

    if (report?.records && Array.isArray(report.records)) {
      report.records = report.records.filter(
        (r: any) => r.fullName !== 'طالب غير متزامن' && !String(r.studentId).startsWith('qr_tok_')
      );
    }

    return report;
  }


  public async getSessionAttendanceRecord(sessionId: string, studentId: string): Promise<any | null> {
    const report = await this.getSessionReport(sessionId);
    if (!report || !Array.isArray(report.records)) return null;
    const rec = report.records.find((r: any) => String(r.studentId).trim() === String(studentId).trim());
    return rec || null;
  }

}
