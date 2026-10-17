import { IOfflineDatabase } from '../types';
import { parseStudentQr } from '../../qr/qr-parser';

export class StudentsQrRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryStudents() {
    return this.db.core.memoryStudents;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getStudentByIdOffline(id: string | number) {
    return this.db.getStudentByIdOffline(id);
  }
  private getGroupByIdOffline(id: string | number) {
    return this.db.getGroupByIdOffline(id);
  }
  private getStudentsOffline(options?: any) {
    return this.db.getStudentsOffline(options);
  }
  private getRoster(groupId: string) {
    return this.db.getRoster(groupId);
  }
  private getAllCachedRosters() {
    return this.db.getAllCachedRosters();
  }

  public async findStudentByQrToken(
    qrCodeToken: string,
    preferredGroupId?: string,
  ): Promise<{
    student: any;
    groupId: string;
    groupName: string;
  } | null> {
    if (!qrCodeToken || typeof qrCodeToken !== 'string') {
      return null;
    }

    const cleanToken = qrCodeToken.trim();
    if (!cleanToken) {
      return null;
    }

    const parsed = parseStudentQr(cleanToken);
    const candidateIds = new Set<string>();

    candidateIds.add(cleanToken);
    candidateIds.add(cleanToken.toLowerCase());
    candidateIds.add(cleanToken.toUpperCase());

    if (parsed.studentId) {
      candidateIds.add(parsed.studentId);
      candidateIds.add(parsed.studentId.toLowerCase());
      candidateIds.add(parsed.studentId.toUpperCase());
    }
    if (parsed.studentCode) {
      candidateIds.add(parsed.studentCode);
      candidateIds.add(parsed.studentCode.toLowerCase());
      candidateIds.add(parsed.studentCode.toUpperCase());
    }
    if (parsed.token) {
      candidateIds.add(parsed.token);
      candidateIds.add(parsed.token.toLowerCase());
      candidateIds.add(parsed.token.toUpperCase());
    }

    // Strip common prefixes for resilient lookup
    const unPrefixed = cleanToken
      .replace(/^qr_tok_/i, '')
      .replace(/^qr_token_/i, '')
      .replace(/^qr[-_]/i, '')
      .replace(/^stu[-_]/i, '');
    if (unPrefixed) {
      candidateIds.add(unPrefixed);
      candidateIds.add(unPrefixed.toLowerCase());
      candidateIds.add(unPrefixed.toUpperCase());
    }

    const norm = (v?: string) => (v ? String(v).trim().toLowerCase().replace(/[^a-z0-9]/gi, '') : '');
    const cleanNorm = norm(cleanToken);

    const matchesStudent = (s: any): boolean => {
      if (!s) return false;
      const sQr = s.qrCodeToken ? String(s.qrCodeToken).trim() : '';
      const sCode = s.studentCode ? String(s.studentCode).trim() : '';
      const sId = String((s as any).studentId || s.id || '').trim();
      const sPhone = s.phone || s.user?.phone || '';
      const sEmergency = s.emergencyPhone || s.parentPhone || '';

      if (candidateIds.has(sQr) || candidateIds.has(sCode) || (sId && candidateIds.has(sId))) {
        return true;
      }
      if (
        (sQr && candidateIds.has(sQr.toLowerCase())) ||
        (sCode && candidateIds.has(sCode.toLowerCase())) ||
        (sId && candidateIds.has(sId.toLowerCase()))
      ) {
        return true;
      }
      if (cleanNorm) {
        if (sQr && norm(sQr) === cleanNorm) return true;
        if (sCode && norm(sCode) === cleanNorm) return true;
        if (sId && norm(sId) === cleanNorm) return true;
        if (sPhone && norm(sPhone) === cleanNorm) return true;
        if (sEmergency && norm(sEmergency) === cleanNorm) return true;
      }
      return false;
    };

    // 1. Direct student store index check (by id or token) - AUTHORITATIVE
    const candidateList = Array.from(candidateIds);
    for (const candidate of candidateList) {
      const student = await this.getStudentByIdOffline(candidate);
      if (student) {
        const studentGroupIds: string[] = Array.isArray(student.groupIds)
          ? student.groupIds
          : [student.groupId].filter((id): id is string => Boolean(id));

        const effectiveGroupId =
          preferredGroupId && (studentGroupIds.includes(preferredGroupId) || student.groupId === preferredGroupId)
            ? preferredGroupId
            : student.groupId || '';

        const group = effectiveGroupId ? await this.getGroupByIdOffline(effectiveGroupId) : null;
        return {
          student,
          groupId: effectiveGroupId,
          groupName: group?.name || 'المجموعة الدراسية',
        };
      }
    }

    if (this.isSupported()) {
      try {
        const { store } = await this.getStore('students', 'readonly');
        for (const candidate of candidateList) {
          let matchedStudent: any = null;
          if (store.indexNames.contains('idx_qrCodeToken')) {
            matchedStudent = await new Promise<any>((resolve) => {
              const req = store.index('idx_qrCodeToken').get(candidate);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          }
          if (!matchedStudent && store.indexNames.contains('idx_studentCode')) {
            matchedStudent = await new Promise<any>((resolve) => {
              const req = store.index('idx_studentCode').get(candidate);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          }
          if (matchedStudent) {
            const studentGroupIds: string[] = Array.isArray(matchedStudent.groupIds)
              ? matchedStudent.groupIds
              : [matchedStudent.groupId].filter((id): id is string => Boolean(id));

            const effectiveGroupId =
              preferredGroupId && (studentGroupIds.includes(preferredGroupId) || matchedStudent.groupId === preferredGroupId)
                ? preferredGroupId
                : matchedStudent.groupId || '';

            const group = effectiveGroupId ? await this.getGroupByIdOffline(effectiveGroupId) : null;
            return {
              student: matchedStudent,
              groupId: effectiveGroupId,
              groupName: group?.name || 'المجموعة الدراسية',
            };
          }
        }
      } catch {}
    }

    // 2. Search all students by qrCodeToken, studentCode, id, or phone - AUTHORITATIVE
    const allStudents = await this.getStudentsOffline();
    const foundDirect = allStudents.find(matchesStudent);

    if (foundDirect) {
      const studentGroupIds: string[] = Array.isArray(foundDirect.groupIds)
        ? foundDirect.groupIds
        : [foundDirect.groupId].filter((id): id is string => Boolean(id));

      const effectiveGroupId =
        preferredGroupId && (studentGroupIds.includes(preferredGroupId) || foundDirect.groupId === preferredGroupId)
          ? preferredGroupId
          : foundDirect.groupId || '';

      const group = effectiveGroupId ? await this.getGroupByIdOffline(effectiveGroupId) : null;
      return {
        student: foundDirect,
        groupId: effectiveGroupId,
        groupName: group?.name || 'المجموعة الدراسية',
      };
    }

    // 3. If preferredGroupId is passed, check that group's roster fallback
    if (preferredGroupId) {
      const preferredRoster = await this.getRoster(preferredGroupId);
      if (preferredRoster?.students) {
        const foundInPreferred = preferredRoster.students.find(matchesStudent);
        if (foundInPreferred) {
          return {
            student: foundInPreferred,
            groupId: preferredGroupId,
            groupName: preferredRoster.groupName || 'المجموعة الحالية',
          };
        }
      }
    }

    // 4. Offline roster cache global fallback (ONLY if student is completely missing from `students` store)
    const rosters = await this.getAllCachedRosters();
    for (const roster of rosters) {
      const found = roster.students.find(matchesStudent);
      if (found) {
        return { student: found, groupId: roster.groupId, groupName: roster.groupName };
      }
    }

    return null;
  }
}
