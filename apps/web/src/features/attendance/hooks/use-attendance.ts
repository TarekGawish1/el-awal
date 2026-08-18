import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroupSessions,
  fetchTodaySessions,
  fetchSessionReport,
  scanQrAttendance,
  recordManualBatch,
} from '../api/attendance.api';
import { BatchAttendanceDto } from '../types/attendance.types';

export function useGroupSessions(groupId: string | null) {
  return useQuery({
    queryKey: ['groups', groupId, 'sessions'],
    queryFn: () => fetchGroupSessions(groupId!),
    enabled: !!groupId,
  });
}

export function useTodaySessions(academicStage?: string, gradeLevel?: string) {
  return useQuery({
    queryKey: ['sessions', 'today', academicStage, gradeLevel],
    queryFn: () => fetchTodaySessions(academicStage, gradeLevel),
  });
}

export function useSessionReport(sessionId: string | null) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'report'],
    queryFn: () => fetchSessionReport(sessionId!),
    enabled: !!sessionId,
  });
}

export function useScanQrAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, qrCodeToken }: { sessionId: string; qrCodeToken: string }) =>
      scanQrAttendance(sessionId, qrCodeToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      // Invalidate group sessions to update attendance records counts
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: BatchAttendanceDto }) =>
      recordManualBatch(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
