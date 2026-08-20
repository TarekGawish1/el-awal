import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroupSessions,
  fetchTodaySessions,
  fetchSessionReport,
  scanQrAttendance,
  recordManualBatch,
} from '../api/attendance.api';
import { BatchAttendanceDto } from '../types/attendance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export function useGroupSessions(groupId: string | null) {
  return useQuery({
    queryKey: ['groups', groupId, 'sessions'],
    queryFn: () => fetchGroupSessions(groupId!),
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
    queryFn: () => fetchTodaySessions(academicStage, gradeLevel, academicYear, academicTerm),
  });
}

export function useSessionReport(sessionId: string | null) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'report'],
    queryFn: async () => {
      const data = await fetchSessionReport(sessionId!);
      // Auto-cache session roster to IndexedDB when loaded
      if (data?.group && data?.roster) {
        offlineDb.cacheRoster({
          groupId: data.group.id,
          groupName: data.group.name,
          gradeLevel: data.group.gradeLevel,
          students: data.roster.map((r: any) => ({
            id: r.studentId,
            fullName: r.studentName,
            studentCode: r.studentCode,
            qrCodeToken: r.qrCodeToken || r.studentCode || r.studentId,
          })),
          updatedAt: Date.now(),
        });
      }
      return data;
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
    }) => {
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
            message: 'الطالب مسجل حضور بالفعل في هذه الحصة مسبقاً (محفوظ محلياً)',
            student: { fullName: resolvedStudentName },
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
          isOfflineSaved: true,
          message: 'تم تسجيل الحضور محلياً بنجاح ووضعه في قائمة الانتظار للمزامنة 💾',
          student: { fullName: resolvedStudentName },
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
            isOfflineSaved: true,
            message: 'تم حفظ الحضور محلياً بنجاح في انتظار الاتصال 💾',
            student: { fullName: localMatch?.student?.fullName || 'طالب' },
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
