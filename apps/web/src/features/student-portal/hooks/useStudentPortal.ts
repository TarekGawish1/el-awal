import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useCourseDetails(courseId: string) {
  return useQuery({
    queryKey: ['student-course-details', courseId],
    queryFn: () => apiClient<any>(`/courses/${courseId}`),
    enabled: !!courseId,
  });
}

export function useLessonDetails(lessonId: string) {
  return useQuery({
    queryKey: ['student-lesson-details', lessonId],
    queryFn: () => apiClient<any>(`/courses/lessons/${lessonId}`),
    enabled: !!lessonId,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, payload }: { lessonId: string; payload: { lastPositionSeconds: number; isCompleted: boolean } }) =>
      apiClient<any>(`/courses/lessons/${lessonId}/progress`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-course-details', data.courseId] });
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-lesson-details', variables.lessonId] });
    },
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

export function useGroupSessions(groupId: string) {
  return useQuery({
    queryKey: ['group-sessions', groupId],
    queryFn: () => apiClient<any>(`/schedules/group/${groupId}/sessions`),
    enabled: !!groupId,
  });
}
