import { StudentEntity, IOfflineDatabase } from '../types';

export class StudentsRepository {
  constructor(private db: IOfflineDatabase) {}

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
  private getGroupsOffline(options?: any) {
    return this.db.getGroupsOffline(options);
  }
  private getAllCachedRosters() {
    return this.db.getAllCachedRosters();
  }
  private getGroupByIdOffline(id: string | number) {
    return this.db.getGroupByIdOffline(id);
  }
  private getPaymentsOffline(options?: any) {
    return this.db.getPaymentsOffline(options);
  }

  public async bulkPutStudents(students: StudentEntity[]): Promise<void> {
    students.forEach((s) => {
      const existing = this.memoryStudents.get(s.id) || {};
      this.memoryStudents.set(s.id, { ...existing, ...s, updatedAt: Date.now() });
    });
    if (!this.isSupported() || students.length === 0) return;
    try {
      const { store } = await this.getStore('students', 'readwrite');
      for (const s of students) {
        store.put(s);
      }
    } catch {
      // Memory fallback holds records
    }
  }

  public async syncStudentsSnapshot(serverStudents: StudentEntity[]): Promise<void> {
    // 1. Collect IDs of any local entities currently pending in outbox
    const pendingIds = await this.getPendingEntityIds();

    const serverStudentIds = new Set(serverStudents.map((s) => s.id));

    // 2. Memory store reconciliation
    const allMemoryIds = Array.from(this.memoryStudents.keys());
    for (const memId of allMemoryIds) {
      if (!serverStudentIds.has(memId) && !pendingIds.has(memId)) {
        this.memoryStudents.delete(memId);
      }
    }
    for (const s of serverStudents) {
      if (!pendingIds.has(s.id)) {
        const existing = this.memoryStudents.get(s.id) || {};
        this.memoryStudents.set(s.id, { ...existing, ...s, updatedAt: Date.now() });
      }
    }

    if (!this.isSupported()) return;

    // 3. IndexedDB store reconciliation
    try {
      const { store } = await this.getStore('students', 'readwrite');
      const allLocalStudents: StudentEntity[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      for (const localStudent of allLocalStudents) {
        if (!serverStudentIds.has(localStudent.id) && !pendingIds.has(localStudent.id)) {
          store.delete(localStudent.id);
        }
      }

      for (const s of serverStudents) {
        if (!pendingIds.has(s.id)) {
          store.put(s);
        }
      }
    } catch (e) {
      console.warn('Error during syncStudentsSnapshot:', e);
    }
    await this.clearRosters();
  }

  public async putStudent(student: StudentEntity): Promise<void> {
    const existingMem = this.memoryStudents.get(student.id);
    const mergedMem = {
      ...(existingMem || {}),
      ...student,
      qrCodeToken: student.qrCodeToken || existingMem?.qrCodeToken || '',
      updatedAt: Date.now(),
    };
    this.memoryStudents.set(student.id, mergedMem);
    if (!this.isSupported()) return;
    try {
      const existing = await this.getStudentByIdOffline(student.id);
      const toSave = {
        ...(existing || {}),
        ...student,
        qrCodeToken: student.qrCodeToken || existing?.qrCodeToken || '',
      };
      const { store } = await this.getStore('students', 'readwrite');
      store.put(toSave);
    } catch {}
  }


  public async removeStudent(id: string): Promise<void> {
    this.memoryStudents.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('students', 'readwrite');
      store.delete(id);
    } catch {}
  }


  public async getStudentsOffline(options?: {
    search?: string;
    groupId?: string;
    gradeLevel?: string;
    academicStage?: string;
    academicStatus?: string;
    academicYear?: string;
    academicTerm?: string;
  }): Promise<StudentEntity[]> {
    let list: StudentEntity[] = [];

    if (!this.isSupported()) {
      list = Array.from(this.memoryStudents.values());
    } else {
      try {
        const { store } = await this.getStore('students', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(Array.from(this.memoryStudents.values()));
        });
      } catch {
        list = Array.from(this.memoryStudents.values());
      }
    }

    const groups = await this.getGroupsOffline();
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    return list.filter((s) => {
      // 1. Exclude soft-deleted / inactive / archived students
      if (s.isArchived === true) return false;
      if (s.user && s.user.isActive === false) return false;
      if (s.isActive === false) return false;

      // 2. Academic Status filter (default to ACTIVE if not explicitly specified)
      const targetStatus = options?.academicStatus || 'ACTIVE';
      const studentStatus = s.academicStatus || 'ACTIVE';
      if (studentStatus !== targetStatus) return false;

      // 3. Grade Level & Academic Stage filter
      if (options?.gradeLevel && s.gradeLevel !== options.gradeLevel) return false;
      if (options?.academicStage && s.academicStage && s.academicStage !== options.academicStage) return false;

      // 4. Group filter
      if (options?.groupId) {
        const studentGroupId = s.groupId || s.groupEnrollments?.[0]?.groupId || s.groupEnrollments?.[0]?.group?.id;
        if (studentGroupId !== options.groupId) return false;
      }

      // 5. Academic Year & Term filter
      if (options?.academicYear || options?.academicTerm) {
        const studentGroupId = s.groupId || s.groupEnrollments?.[0]?.groupId || s.groupEnrollments?.[0]?.group?.id;
        const group = studentGroupId ? groupMap.get(studentGroupId) : null;
        if (group) {
          if (options.academicYear && group.academicYear && group.academicYear !== options.academicYear) return false;
          if (options.academicTerm && group.academicTerm && group.academicTerm !== options.academicTerm) return false;
        }
      }

      // 6. Search query
      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        const matchesName = (s.fullName || s.user?.fullName || '').toLowerCase().includes(q);
        const matchesCode = (s.studentCode || '').toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q) || s.user?.phone?.includes(q) || s.parentPhone?.includes(q);
        const matchesQr = (s.qrCodeToken || '').includes(q);
        return matchesName || matchesCode || matchesPhone || matchesQr;
      }

      return true;
    });
  }

  public async getStudentByIdOffline(id: string | number): Promise<StudentEntity | null> {
    const cleanId = String(id);
    if (!this.isSupported()) {
      const mem = this.memoryStudents.get(cleanId);
      if (mem) return mem;
      for (const roster of Array.from(this.memoryRosters.values())) {
        const found = roster.students.find((s) => String(s.id) === cleanId);
        if (found) {
          return {
            id: String(found.id),
            fullName: found.fullName,
            studentCode: found.studentCode || `STU-${cleanId.slice(0, 6)}`,
            qrCodeToken: found.qrCodeToken || cleanId,
            gradeLevel: found.gradeLevel || roster.gradeLevel,
            groupId: roster.groupId,
            user: {
              id: String(found.id),
              fullName: found.fullName,
              phone: found.emergencyPhone || found.parentPhone || '',
              isActive: true,
            },
          };
        }
      }
      return null;
    }
    try {
      const { store } = await this.getStore('students', 'readonly');
      const student = await new Promise<StudentEntity | null>((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryStudents.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryStudents.get(cleanId) || null);
      });

      if (student) return student;

      const rosters = await this.getAllCachedRosters();
      for (const roster of rosters) {
        const found = roster.students.find((s) => String(s.id) === cleanId);
        if (found) {
          return {
            id: String(found.id),
            fullName: found.fullName,
            studentCode: found.studentCode || `STU-${cleanId.slice(0, 6)}`,
            qrCodeToken: found.qrCodeToken || cleanId,
            gradeLevel: found.gradeLevel || roster.gradeLevel,
            groupId: roster.groupId,
            user: {
              id: String(found.id),
              fullName: found.fullName,
              phone: found.emergencyPhone || found.parentPhone || '',
              isActive: true,
            },
          };
        }
      }

      return null;
    } catch {
      return this.memoryStudents.get(cleanId) || null;
    }
  }

  public async getStudentDetailsOffline(id: string | number): Promise<any | null> {
    const cleanId = String(id);
    const student = await this.getStudentByIdOffline(cleanId);
    if (!student) {
      return null;
    }

    const group = student.groupId ? await this.getGroupByIdOffline(student.groupId) : null;
    const payments = await this.getPaymentsOffline({ studentId: cleanId });

    return {
      id: student.id,
      studentCode: student.studentCode || `STU-${cleanId.slice(0, 6)}`,
      qrCodeToken: student.qrCodeToken || cleanId,
      gradeLevel: student.gradeLevel || group?.gradeLevel || 'الصف الدراسي',
      academicStage: student.academicStage || '',
      academicStatus: student.academicStatus || 'ACTIVE',
      emergencyPhone: student.emergencyPhone || student.parentPhone || '',
      createdAt: new Date(student.updatedAt || Date.now()).toISOString(),
      updatedAt: new Date(student.updatedAt || Date.now()).toISOString(),
      user: {
        id: student.userId || student.id,
        fullName: student.fullName || student.user?.fullName || 'طالب',
        phone: student.phone || student.user?.phone || '',
        email: student.email || student.user?.email || '',
        isActive: student.user?.isActive ?? true,
      },
      groupEnrollments: student.groupEnrollments && student.groupEnrollments.length > 0
        ? student.groupEnrollments
        : group
          ? [{ group: { id: group.id, name: group.name, gradeLevel: group.gradeLevel || student.gradeLevel || '' } }]
          : [],
      parentLinks: student.parentLinks && student.parentLinks.length > 0
        ? student.parentLinks
        : student.parentPhone
          ? [{ parent: { user: { id: `p-${student.id}`, fullName: 'ولي الأمر', phone: student.parentPhone, isActive: true } } }]
          : [],
      attendanceRecords: student.attendanceRecords || [],
      paymentRecords: payments || [],
    };
  }
}
