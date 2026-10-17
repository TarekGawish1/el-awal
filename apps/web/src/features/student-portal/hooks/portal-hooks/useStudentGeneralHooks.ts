import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi, StudentGroupQuery } from '../../api/student.api';
import { useAuth } from '@/features/auth';
import { apiClient } from '@/lib/api/client';
import { offlineDb, getStudentDetailsOffline } from '@/lib/offline/db';
import { StudentDetail } from '@/features/students/types/students.types';

export function useStudentProfile(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery<StudentDetail | null>({
    queryKey: ['student-profile', studentId],
    enabled: (options?.enabled ?? true) && !!studentId && user?.role === 'STUDENT',
    queryFn: async (): Promise<StudentDetail | null> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline && studentId) {
        return (await getStudentDetailsOffline(studentId)) as unknown as StudentDetail | null;
      }
      try {
        return await studentApi.getProfile(studentId!);
      } catch {
        if (studentId) {
          return (await getStudentDetailsOffline(studentId)) as unknown as StudentDetail | null;
        }
        return null;
      }
    },
    staleTime: 300_000,
  });
}

export function useStudentDashboardOverview() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-dashboard-overview', studentId],
    enabled: !!studentId && user?.role === 'STUDENT',
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return null;
      }
      return await apiClient<any>('/students/dashboard/overview');
    },
    staleTime: 60_000,
  });
}

export function useStudentQrCode() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-qr-code', studentId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline && studentId) {
        const student = await offlineDb.getStudentByIdOffline(studentId);
        return {
          id: studentId,
          studentId,
          qrCodeToken: student?.qrCodeToken || studentId,
          qrCodeSvg: null,
          qrCodeDataUrl: null,
        };
      }
      try {
        return await studentApi.getQrCode(studentId!);
      } catch {
        const student = studentId ? await offlineDb.getStudentByIdOffline(studentId) : null;
        return {
          id: studentId || '',
          studentId: studentId || '',
          qrCodeToken: student?.qrCodeToken || studentId || '',
          qrCodeSvg: null,
          qrCodeDataUrl: null,
        };
      }
    },
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useStudentGroup(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['student-group'],
    queryFn: () => studentApi.getMyGroup(),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}

export function useAvailableGroups() {
  return useQuery({
    queryKey: ['available-groups'],
    queryFn: () => studentApi.getAvailableGroups(),
  });
}

export function useReserveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => studentApi.reserveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      queryClient.invalidateQueries({ queryKey: ['student-group'] });
    },
  });
}

export function useStudentGroupSessions(query: StudentGroupQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['student-group-sessions', query.year, query.month],
    queryFn: () => studentApi.getMyGroupSessions(query),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useSendHomeworkUpload() {
  return useMutation({
    mutationFn: (payload: { fileName: string; contentType: string; fileSizeBytes: number }) =>
      studentApi.generateHomeworkUploadUrl(payload),
  });
}

export function useSubmitHomework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      payload,
    }: {
      assessmentId: string;
      payload: { sessionId: string; fileKey: string; fileUrl: string; studentNotes?: string };
    }) => studentApi.submitHomework(assessmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-group-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['student-group'] });
    },
  });
}

export function useStudentAssessments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['student-assessments'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getAssessmentsOffline();
      }
      try {
        const assessments = await apiClient<any>('/assessments');
        if (assessments && Array.isArray(assessments) && assessments.length > 0) {
          offlineDb.bulkPutAssessments(assessments);
        }
        return assessments;
      } catch {
        return offlineDb.getAssessmentsOffline();
      }
    },
  });
}

export function useStudentPayments() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline && studentId) {
        return offlineDb.getPaymentsOffline({ studentId });
      }
      try {
        return await apiClient<any>(`/subscriptions/student/${studentId}`);
      } catch {
        return studentId ? offlineDb.getPaymentsOffline({ studentId }) : [];
      }
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useStudentAttendance() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return [];
      }
      try {
        return await apiClient<any>(`/attendance/student/${studentId}`);
      } catch {
        return [];
      }
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useGroupSessions(groupId: string) {
  return useQuery({
    queryKey: ['group-sessions', groupId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getSessionsOffline(groupId);
      }
      try {
        return await apiClient<any>(`/schedules/group/${groupId}/sessions`);
      } catch {
        return offlineDb.getSessionsOffline(groupId);
      }
    },
    enabled: !!groupId,
  });
}
