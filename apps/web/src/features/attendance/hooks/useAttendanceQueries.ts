import { useQuery } from '@tanstack/react-query';
import {
  fetchGroupSessions,
  fetchTodaySessions,
  fetchSessionReport,
  fetchStudentAttendanceHistory,
} from '../api/attendance.api';
import { offlineDb } from '@/lib/offline/db';
import { useAuthStore } from '@/features/auth/store/auth.store';

export function useGroupSessions(groupId: string | null) {
  return useQuery({
    queryKey: ['groups', groupId, 'sessions'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getSessionsOffline(groupId || undefined);
      }
      try {
        const sessions = await fetchGroupSessions(groupId!);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions);
        }
        return sessions;
      } catch {
        return offlineDb.getSessionsOffline(groupId || undefined);
      }
    },
    enabled: !!groupId,
    networkMode: 'always',
    staleTime: 30 * 1000,
  });
}

export function useTodaySessions(
  academicStage?: string,
  gradeLevel?: string,
  academicYear?: string,
  academicTerm?: string,
) {
  return useQuery({
    queryKey: ['sessions', 'today', academicStage, gradeLevel, academicYear, academicTerm],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const sessions = await offlineDb.getSessionsOffline();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDayOfWeek = new Date().getDay();

        const todaySessions = sessions.filter((s) => {
          if (s.sessionDate) {
            return s.sessionDate.startsWith(todayStr);
          }
          if (s.dayOfWeek !== undefined) {
            return s.dayOfWeek === todayDayOfWeek;
          }
          return true;
        });

        const resultList = todaySessions.length > 0 ? todaySessions : sessions;
        return resultList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
      try {
        const sessions = await fetchTodaySessions(academicStage, gradeLevel, academicYear, academicTerm);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions);
        }
        return sessions;
      } catch {
        const sessions = await offlineDb.getSessionsOffline();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDayOfWeek = new Date().getDay();

        const todaySessions = sessions.filter((s) => {
          if (s.sessionDate) {
            return s.sessionDate.startsWith(todayStr);
          }
          if (s.dayOfWeek !== undefined) {
            return s.dayOfWeek === todayDayOfWeek;
          }
          return true;
        });

        const resultList = todaySessions.length > 0 ? todaySessions : sessions;
        return resultList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
    },
    networkMode: 'always',
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useSessionReport(sessionId: string | null) {
  return useQuery<any>({
    queryKey: ['sessions', sessionId, 'report'],
    queryFn: async () => {
      if (!sessionId) return null;
      const cleanSessionId = String(sessionId).trim().toLowerCase();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      const buildOfflineReport = async () => {
        const cachedReport = await offlineDb.getSessionReport(cleanSessionId);

        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find(
          (s) => String(s.id).trim().toLowerCase() === cleanSessionId,
        );
        const targetGroupId = session?.groupId || cachedReport?.groupId || '';
        let roster = targetGroupId ? await offlineDb.getRoster(targetGroupId) : null;
        const group = targetGroupId ? await offlineDb.getGroupByIdOffline(targetGroupId) : null;
        const groupStudents = targetGroupId
          ? await offlineDb.getStudentsOffline({ groupId: targetGroupId })
          : await offlineDb.getStudentsOffline();

        if (!roster && targetGroupId) {
          roster = {
            groupId: targetGroupId,
            groupName: group?.name || session?.group?.name || 'المجموعة الدراسية',
            gradeLevel: group?.gradeLevel || '',
            monthlyFee: group?.monthlyFee || 0,
            students: groupStudents.map((st) => ({
              id: st.id,
              fullName: st.fullName || st.user?.fullName || 'طالب',
              studentCode: st.studentCode || `STU-${st.id.slice(0, 6)}`,
              qrCodeToken: st.qrCodeToken || st.id,
              gradeLevel: st.gradeLevel || group?.gradeLevel || '',
              academicStatus: st.academicStatus || 'ACTIVE',
            })),
            updatedAt: Date.now(),
          };
        }

        const allRosterStudents = roster?.students?.length
          ? roster.students
          : groupStudents.map((st) => ({
              id: st.id,
              fullName: st.fullName || st.user?.fullName || 'طالب',
              studentCode: st.studentCode || `STU-${st.id.slice(0, 6)}`,
              qrCodeToken: st.qrCodeToken || st.id,
              gradeLevel: st.gradeLevel || group?.gradeLevel || '',
              academicStatus: st.academicStatus || 'ACTIVE',
            }));

        const currentUserId = useAuthStore.getState().user?.id;
        const pendingMutations = currentUserId ? await offlineDb.getPendingMutations(currentUserId) : [];
        const sessionMutations = pendingMutations.filter(
          (m) =>
            m.domain === 'attendance' &&
            m.payload &&
            String(m.payload.sessionId || '').trim().toLowerCase() === cleanSessionId,
        );

        const recordsMap = new Map<string, any>();

        if (cachedReport?.records && Array.isArray(cachedReport.records)) {
          for (const r of cachedReport.records) {
            if (r.studentId) {
              recordsMap.set(String(r.studentId).trim(), r);
            }
          }
        }

        for (const mut of sessionMutations) {
          const p = mut.payload;
          if (p.studentId) {
            const cleanStId = String(p.studentId).trim();
            const existing = recordsMap.get(cleanStId);
            recordsMap.set(cleanStId, {
              ...existing,
              id: mut.id,
              studentId: p.studentId,
              status: p.status || existing?.status || 'PRESENT',
              recordingMethod: p.recordingMethod || existing?.recordingMethod || 'QR_SCAN',
              recordedAt: new Date(mut.clientTimestamp).toISOString(),
              notes: p.notes || existing?.notes,
            });
          }
        }

        const fullRecords = allRosterStudents.map((st) => {
          const cleanStId = String(st.id).trim();
          const rec = recordsMap.get(cleanStId);
          return {
            id: rec?.id || `unrecorded-${st.id}`,
            studentId: st.id,
            studentCode: st.studentCode || '',
            fullName: st.fullName || 'طالب',
            phone: (st as any).phone || (st as any).user?.phone || null,
            status: rec?.status || null,
            recordingMethod: rec?.recordingMethod || null,
            recordedAt: rec?.recordedAt || null,
            notes: rec?.notes || null,
          };
        });

        recordsMap.forEach((rec, stId) => {
          if (!fullRecords.some((r) => String(r.studentId).trim() === stId)) {
            fullRecords.push({
              id: rec.id,
              studentId: stId,
              studentCode: rec.studentCode || '',
              fullName: rec.fullName || rec.studentName || 'طالب ضيف',
              phone: null,
              status: rec.status || 'PRESENT',
              recordingMethod: rec.recordingMethod || 'QR_SCAN',
              recordedAt: rec.recordedAt || new Date().toISOString(),
              notes: rec.notes || 'حضور استثنائي',
            });
          }
        });

        const totalEnrolled = Math.max(allRosterStudents.length, cachedReport?.metrics?.totalEnrolled || 0);
        const presentCount = fullRecords.filter((r) => r.status === 'PRESENT').length;
        const excusedCount = fullRecords.filter((r) => r.status === 'EXCUSED').length;

        const sessionDateStr = session?.sessionDate ? session.sessionDate.split('T')[0] : '';
        const todayDateStr = new Date().toISOString().split('T')[0];
        const isPastSession = Boolean(sessionDateStr && sessionDateStr < todayDateStr);

        const explicitAbsentCount = fullRecords.filter((r) => r.status === 'ABSENT').length;
        const calculatedAbsent =
          explicitAbsentCount > 0
            ? explicitAbsentCount
            : isPastSession
            ? Math.max(0, totalEnrolled - presentCount - excusedCount)
            : 0;
        const attendanceRatePercentage =
          totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

        const builtReport = {
          sessionId: sessionId || '',
          sessionDate: session?.sessionDate || cachedReport?.sessionDate || new Date().toISOString(),
          topic: session?.topic || cachedReport?.topic || 'رصد الحضور',
          groupId: targetGroupId,
          groupName:
            roster?.groupName ||
            group?.name ||
            session?.group?.name ||
            cachedReport?.groupName ||
            'المجموعة الدراسية',
          metrics: {
            totalEnrolled,
            presentCount,
            absentCount: calculatedAbsent,
            excusedCount,
            attendanceRatePercentage,
          },
          session: session || cachedReport?.session || {
            id: sessionId,
            groupId: targetGroupId,
            sessionDate: new Date().toISOString(),
            topic: 'رصد الحضور',
            startTime: '16:00',
            endTime: '18:00',
          },
          group: group || cachedReport?.group || (roster ? { id: roster.groupId, name: roster.groupName, gradeLevel: roster.gradeLevel } : null),
          roster: allRosterStudents.map((s) => ({
            studentId: s.id,
            studentName: s.fullName,
            studentCode: s.studentCode,
            qrCodeToken: s.qrCodeToken,
            attendanceStatus: recordsMap.get(String(s.id).trim())?.status || null,
          })),
          records: fullRecords,
          stats: {
            totalEnrolled,
            totalPresent: presentCount,
            totalAbsent: calculatedAbsent,
          },
        };

        await offlineDb.cacheSessionReport(cleanSessionId, builtReport);
        return builtReport;
      };

      if (!isOnline) {
        return buildOfflineReport();
      }

      try {
        const data = await fetchSessionReport(sessionId!);
        if (data) {
          if (data.groupId && data.records) {
            offlineDb.cacheRoster({
              groupId: data.groupId,
              groupName: data.groupName || 'المجموعة الدراسية',
              students: data.records.map((r: any) => ({
                id: r.studentId || r.id,
                fullName: r.fullName || r.studentName || '',
                studentCode: r.studentCode,
                qrCodeToken: r.qrCodeToken || r.studentCode || r.studentId || r.id,
              })),
              updatedAt: Date.now(),
            });
          }
          await offlineDb.cacheSessionReport(cleanSessionId, data);
        }
        return data;
      } catch {
        return buildOfflineReport();
      }
    },
    enabled: !!sessionId,
    networkMode: 'always',
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: () => {
      return typeof navigator !== 'undefined' && navigator.onLine ? 5000 : false;
    },
  });
}

export function useStudentAttendanceHistory(studentId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['students', studentId, 'attendance-history', limit],
    queryFn: async () => {
      if (!studentId) return null;
      try {
        const response = await fetchStudentAttendanceHistory(studentId, limit);
        return response?.data || [];
      } catch (error) {
        console.error('Failed to fetch student attendance history', error);
        return [];
      }
    },
    enabled: !!studentId,
    networkMode: 'always',
    staleTime: 60 * 1000,
  });
}
