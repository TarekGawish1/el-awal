import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroupSessions,
  fetchTodaySessions,
  fetchSessionReport,
  scanQrAttendance,
  recordManualBatch,
} from '../api/attendance.api';
import { BatchAttendanceDto, ScanQrResponse } from '../types/attendance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

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
    networkMode: 'offlineFirst',
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
    networkMode: 'offlineFirst',
    staleTime: 30 * 1000,
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
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find(
          (s) => String(s.id).trim().toLowerCase() === cleanSessionId,
        );
        const targetGroupId = session?.groupId || '';
        let roster = targetGroupId ? await offlineDb.getRoster(targetGroupId) : null;
        const group = targetGroupId ? await offlineDb.getGroupByIdOffline(targetGroupId) : null;

        if (!roster && targetGroupId) {
          const groupStudents = await offlineDb.getStudentsOffline({ groupId: targetGroupId });
          roster = {
            groupId: targetGroupId,
            groupName: group?.name || 'المجموعة الدراسية',
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

        const studentCount = roster?.students?.length || 0;

        return {
          sessionId: sessionId || '',
          sessionDate: session?.sessionDate || new Date().toISOString(),
          topic: session?.topic || 'رصد الحضور',
          groupId: targetGroupId,
          groupName: roster?.groupName || group?.name || session?.group?.name || 'المجموعة الدراسية',
          metrics: {
            totalEnrolled: studentCount,
            presentCount: 0,
            absentCount: studentCount,
            excusedCount: 0,
            attendanceRatePercentage: 0,
          },
          session: session || {
            id: sessionId,
            groupId: targetGroupId,
            sessionDate: new Date().toISOString(),
            topic: 'رصد الحضور',
            startTime: '16:00',
            endTime: '18:00',
          },
          group: group || (roster ? { id: roster.groupId, name: roster.groupName, gradeLevel: roster.gradeLevel } : null),
          roster:
            roster?.students?.map((s) => ({
              studentId: s.id,
              studentName: s.fullName,
              studentCode: s.studentCode,
              qrCodeToken: s.qrCodeToken,
              attendanceStatus: 'ABSENT',
            })) || [],
          records: [],
          stats: { totalEnrolled: studentCount, presentCount: 0, absentCount: studentCount },
        };
      };

      if (!isOnline) {
        return buildOfflineReport();
      }

      try {
        const data = await fetchSessionReport(sessionId!);
        if (data && data.groupId && data.records) {
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
        return data;
      } catch {
        return buildOfflineReport();
      }
    },
    enabled: !!sessionId,
    networkMode: 'offlineFirst',
    staleTime: 30 * 1000,
  });
}

export function useScanQrAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      qrCodeToken,
      allowCrossGroup,
    }: {
      sessionId: string;
      qrCodeToken: string;
      allowCrossGroup?: boolean;
    }): Promise<ScanQrResponse & { isOfflineSaved?: boolean }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // Resolve student offline
        const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken);
        const reportData: any = queryClient.getQueryData(['sessions', sessionId, 'report']);

        const resolvedStudentName =
          localMatch?.student?.fullName ||
          reportData?.roster?.find(
            (r: any) =>
              r.qrCodeToken === qrCodeToken ||
              r.studentCode === qrCodeToken ||
              r.studentId === qrCodeToken,
          )?.studentName ||
          'طالب';

        const studentId =
          localMatch?.student?.id ||
          reportData?.roster?.find(
            (r: any) =>
              r.qrCodeToken === qrCodeToken ||
              r.studentCode === qrCodeToken ||
              r.studentId === qrCodeToken,
          )?.studentId;

        // Check duplicate
        const existingRecord = reportData?.records?.find(
          (r: any) => r.studentId === studentId && r.status === 'PRESENT',
        );

        if (existingRecord) {
          return {
            isDuplicate: true,
            isCrossGroupPrompt: false,
            message: 'الطالب مسجل حضور بالفعل في هذه الحصة مسبقاً (محفوظ محلياً)',
            student: { id: studentId || '', fullName: resolvedStudentName },
            sessionStats: reportData?.stats,
          };
        }

        // Optimistically update query data
        if (reportData && studentId) {
          const updatedRecords = [
            ...(reportData.records || []),
            {
              id: `offline-${Date.now()}`,
              sessionId,
              studentId,
              studentName: resolvedStudentName,
              status: 'PRESENT',
              recordingMethod: 'QR_SCAN',
              recordedAt: new Date().toISOString(),
            },
          ];

          const totalEnrolled = Number(reportData.metrics?.totalEnrolled ?? reportData.stats?.totalEnrolled ?? updatedRecords.length);
          const presentCount = Number((reportData.metrics?.presentCount ?? reportData.stats?.totalPresent ?? 0) + 1);
          const absentCount = Math.max(0, totalEnrolled - presentCount);
          const ratePercentage = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 100;

          queryClient.setQueryData(['sessions', sessionId, 'report'], {
            ...reportData,
            records: updatedRecords,
            metrics: {
              ...reportData.metrics,
              totalEnrolled,
              presentCount,
              absentCount,
              attendanceRatePercentage: ratePercentage,
            },
            stats: {
              ...reportData.stats,
              totalEnrolled,
              totalPresent: presentCount,
              totalAbsent: absentCount,
            },
          });
        }

        // Enqueue mutation into IndexedDB outbox
        await syncEngine.enqueue(
          'attendance',
          API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
          'POST',
          {
            sessionId,
            qrCodeToken,
            studentId,
            status: 'PRESENT',
            recordingMethod: 'QR_SCAN',
            allowCrossGroup,
          },
        );

        return {
          isDuplicate: false,
          isCrossGroupPrompt: false,
          isOfflineSaved: true,
          message: 'تم تسجيل الحضور محلياً بنجاح ووضعه في قائمة الانتظار للمزامنة 💾',
          student: { id: studentId || '', fullName: resolvedStudentName },
          sessionStats: reportData?.stats,
        };
      }

      try {
        return await scanQrAttendance(sessionId, qrCodeToken, allowCrossGroup);
      } catch (error: any) {
        // Fallback to offline queue if network connection drops mid-scan
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken);
          const studentId = localMatch?.student?.id;

          await syncEngine.enqueue(
            'attendance',
            API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
            'POST',
            {
              sessionId,
              qrCodeToken,
              studentId,
              status: 'PRESENT',
              recordingMethod: 'QR_SCAN',
              allowCrossGroup,
            },
          );

          return {
            isDuplicate: false,
            isCrossGroupPrompt: false,
            isOfflineSaved: true,
            message: 'تم حفظ الحضور محلياً بنجاح في انتظار الاتصال 💾',
            student: { id: studentId || '', fullName: localMatch?.student?.fullName || 'طالب' },
          };
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (!data?.isOfflineSaved) {
        queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: BatchAttendanceDto;
    }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // Enqueue batch manual attendance into outbox
        for (const item of payload.records) {
          await syncEngine.enqueue(
            'attendance',
            API_ENDPOINTS.ATTENDANCE.MANUAL(sessionId),
            'POST',
            {
              sessionId,
              studentId: item.studentId,
              status: item.status,
              notes: item.notes,
              recordingMethod: 'MANUAL',
            },
          );
        }

        return {
          success: true,
          isOfflineSaved: true,
          message: 'تم حفظ الكشف اليدوي محلياً في انتظار المزامنة 💾',
        };
      }

      return recordManualBatch(sessionId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
