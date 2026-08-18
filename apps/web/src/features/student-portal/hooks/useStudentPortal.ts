import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../api/student.api';
import { useAuth } from '@/features/auth';
import { apiClient } from '@/lib/api/client';

export function useStudentProfile() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => studentApi.getProfile(studentId!),
    enabled: !!studentId,
  });
}

export function useStudentQrCode() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-qr-code', studentId],
    queryFn: () => studentApi.getQrCode(studentId!),
    enabled: !!studentId,
  });
}

export function useStudentCourses() {
  return useQuery({
    queryKey: ['student-courses'],
    queryFn: () => apiClient<any>('/courses/my-courses'),
  });
}

export function useStudentAssessments() {
  return useQuery({
    queryKey: ['student-assessments'],
    queryFn: () => apiClient<any>('/assessments'),
  });
}

export function useStudentPayments() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: () => apiClient<any>(`/subscriptions/student/${studentId}`),
    enabled: !!studentId,
  });
}

export function useStudentAttendance() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: () => apiClient<any>(`/attendance/student/${studentId}`),
    enabled: !!studentId,
  });
}
