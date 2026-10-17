import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordManualBatch } from '../api/attendance.api';
import { BatchAttendanceDto } from '../types/attendance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

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
        let updatedReport: any = null;
        for (const item of payload.records) {
          updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
            studentId: item.studentId,
            status: item.status,
            notes: item.notes,
            recordingMethod: 'MANUAL',
            recordedAt: new Date().toISOString(),
          });

          if (item.status === 'ABSENT') {
            await offlineDb.deleteHomeworkForSessionStudent(sessionId, item.studentId);
            await syncEngine.enqueue(
              'attendance',
              `/attendance/sessions/${sessionId}/homework/${item.studentId}`,
              'DELETE',
              { sessionId, studentId: item.studentId },
            );
          }

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

        if (payload.removedStudentIds && payload.removedStudentIds.length > 0) {
          for (const studentId of payload.removedStudentIds) {
            await offlineDb.revertAttendanceRecordOffline(sessionId, studentId);
            await offlineDb.deleteHomeworkForSessionStudent(sessionId, studentId);
            await syncEngine.enqueue(
              'attendance',
              `/attendance/sessions/${sessionId}/records/${studentId}`,
              'DELETE',
              { sessionId, studentId },
            );
            await syncEngine.enqueue(
              'attendance',
              `/attendance/sessions/${sessionId}/homework/${studentId}`,
              'DELETE',
              { sessionId, studentId },
            );
          }
          updatedReport = await offlineDb.getSessionReport(sessionId);
        }

        if (updatedReport) {
          queryClient.setQueryData(['sessions', sessionId, 'report'], updatedReport);
        }

        queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });
        queryClient.invalidateQueries({ queryKey: ['homework-records', sessionId] });

        return {
          success: true,
          isOfflineSaved: true,
          message: 'تم حفظ الكشف اليدوي محلياً في انتظار المزامنة 💾',
        };
      }

      if (payload.removedStudentIds && payload.removedStudentIds.length > 0) {
        for (const studentId of payload.removedStudentIds) {
          await offlineDb.revertAttendanceRecordOffline(sessionId, studentId).catch(() => {});
          await offlineDb.deleteHomeworkForSessionStudent(sessionId, studentId).catch(() => {});
        }
      }
      for (const item of payload.records) {
        if (item.status === 'ABSENT') {
          await offlineDb.deleteHomeworkForSessionStudent(sessionId, item.studentId).catch(() => {});
        }
      }

      return recordManualBatch(sessionId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      queryClient.invalidateQueries({ queryKey: ['homework-records', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
