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
        return offlineDb.getSessionsOffline();
      }
      try {
        const sessions = await fetchTodaySessions(academicStage, gradeLevel, academicYear, academicTerm);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions);
        }
        return sessions;
      } catch {
        return offlineDb.getSessionsOffline();
      }
    },
  });
}

export function useSessionReport(sessionId: string | null) {
  return useQuery<any>({
    queryKey: ['sessions', sessionId, 'report'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        // Build report offline from cached roster and session
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find((s) => s.id === sessionId);
        const roster = session ? await offlineDb.getRoster(session.groupId) : null;
        return {
          sessionId: sessionId || '',
          sessionDate: session?.sessionDate || new Date().toISOString(),
          topic: session?.topic || 'رصد الحضور',
          groupId: session?.groupId || roster?.groupId || '',
          groupName: roster?.groupName || session?.group?.name || 'المجموعة الدراسية',
          metrics: {
            totalEnrolled: roster?.students?.length || 0,
            presentCount: 0,
            absentCount: roster?.students?.length || 0,
            excusedCount: 0,
            attendanceRatePercentage: 0,
          },
          session,
          group: roster ? { id: roster.groupId, name: roster.groupName, gradeLevel: roster.gradeLevel } : null,
          roster: roster?.students?.map((s) => ({
            studentId: s.id,
            studentName: s.fullName,
            studentCode: s.studentCode,
            qrCodeToken: s.qrCodeToken,
            attendanceStatus: 'ABSENT',
          })) || [],
          records: [],
          stats: { totalEnrolled: roster?.students?.length || 0, presentCount: 0, absentCount: roster?.students?.length || 0 },
        };
      }

      try {
        const data = await fetchSessionReport(sessionId!);
        // Auto-cache session roster to IndexedDB when loaded
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
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find((s) => s.id === sessionId);
        const roster = session ? await offlineDb.getRoster(session.groupId) : null;
        return {
          sessionId: sessionId || '',
          sessionDate: session?.sessionDate || new Date().toISOString(),
          topic: session?.topic || 'رصد الحضور',
          groupId: session?.groupId || roster?.groupId || '',
          groupName: roster?.groupName || session?.group?.name || 'المجموعة الدراسية',
          metrics: {
            totalEnrolled: roster?.students?.length || 0,
            presentCount: 0,
            absentCount: roster?.students?.length || 0,
            excusedCount: 0,
            attendanceRatePercentage: 0,
          },
          session,
          group: roster ? { id: roster.groupId, name: roster.groupName, gradeLevel: roster.gradeLevel } : null,
          roster: roster?.students?.map((s) => ({
            studentId: s.id,
            studentName: s.fullName,
            studentCode: s.studentCode,
            qrCodeToken: s.qrCodeToken,
            attendanceStatus: 'ABSENT',
          })) || [],
          records: [],
          stats: { totalEnrolled: roster?.students?.length || 0, presentCount: 0, absentCount: roster?.students?.length || 0 },
        };
      }
    },
    enabled: !!sessionId,
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

          queryClient.setQueryData(['sessions', sessionId, 'report'], {
            ...reportData,
            records: updatedRecords,
            stats: {
              ...reportData.stats,
              totalPresent: (reportData.stats?.totalPresent || 0) + 1,
              totalAbsent: Math.max(0, (reportData.stats?.totalAbsent || 0) - 1),
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
