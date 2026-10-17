import { offlineDb } from '@/lib/offline/db';
import { apiClient } from '@/lib/api/client';

export interface ResolveStudentContext {
  groupId?: string;
  sessionReport?: any;
}

export async function resolveStudentFromQr(
  rawValue: string,
  parsed: { token?: string; studentId?: string; studentCode?: string },
  ctx: ResolveStudentContext
): Promise<any | null> {
  const cleanToken = parsed.token || parsed.studentId || parsed.studentCode || rawValue.trim();
  const effectiveGroupId = ctx.groupId || ctx.sessionReport?.groupId;

  let matchQr = await offlineDb.findStudentByQrToken(rawValue, effectiveGroupId);
  if (!matchQr && cleanToken !== rawValue) {
    matchQr = await offlineDb.findStudentByQrToken(cleanToken, effectiveGroupId);
  }
  let student = matchQr?.student;

  if (!student) {
    student = await offlineDb.getStudentByIdOffline(cleanToken);
  }

  if (!student) {
    const allStudents = await offlineDb.getStudentsOffline();
    student = allStudents.find(
      (s: any) =>
        s.qrCodeToken === cleanToken ||
        s.qrCodeToken === rawValue ||
        s.studentCode === cleanToken ||
        (parsed.studentCode && s.studentCode === parsed.studentCode) ||
        s.id === cleanToken ||
        (parsed.studentId && s.id === parsed.studentId)
    );
  }

  if (!student && ctx.sessionReport?.records) {
    const match = ctx.sessionReport.records.find(
      (r: any) =>
        r.studentId === cleanToken ||
        (r.qrCodeToken && (r.qrCodeToken === cleanToken || r.qrCodeToken === rawValue)) ||
        (r.studentCode && (r.studentCode === cleanToken || r.studentCode === parsed.studentCode)) ||
        (parsed.studentId && r.studentId === parsed.studentId)
    );
    if (match) {
      student = {
        id: match.studentId,
        fullName: match.fullName || match.studentName || 'طالب',
        studentCode: match.studentCode || '',
        qrCodeToken: match.qrCodeToken || cleanToken,
        groupId: ctx.sessionReport.groupId || ctx.groupId || '',
        gradeLevel: match.gradeLevel || '',
      };
      offlineDb.putStudent(student).catch(() => {});
    }
  }

  if (!student && effectiveGroupId) {
    const roster = await offlineDb.getRoster(effectiveGroupId);
    if (roster?.students) {
      const match = roster.students.find(
        (s: any) =>
          s.id === cleanToken ||
          s.qrCodeToken === cleanToken ||
          s.qrCodeToken === rawValue ||
          s.studentCode === cleanToken ||
          (parsed.studentCode && s.studentCode === parsed.studentCode)
      );
      if (match) {
        student = match;
        offlineDb.putStudent(student).catch(() => {});
      }
    }
  }

  if (!student && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const searchRes = await apiClient<any>(`/students?search=${encodeURIComponent(cleanToken)}&limit=1`, {
        method: 'GET',
      });
      const searchList = searchRes?.data || searchRes?.students || searchRes?.data?.data || [];
      if (Array.isArray(searchList) && searchList.length > 0) {
        const onlineStudent = searchList[0];
        student = {
          id: onlineStudent.id,
          fullName: onlineStudent.fullName || onlineStudent.user?.fullName || 'طالب',
          studentCode: onlineStudent.studentCode || '',
          qrCodeToken: onlineStudent.qrCodeToken || cleanToken,
          groupId: onlineStudent.groupId || ctx.groupId || '',
          gradeLevel: onlineStudent.gradeLevel || '',
        };
        offlineDb.putStudent(student).catch(() => {});
      }
    } catch {}
  }

  return student || null;
}
