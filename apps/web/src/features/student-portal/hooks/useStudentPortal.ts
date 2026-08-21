import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../api/student.api';
import { useAuth } from '@/features/auth';
import { apiClient } from '@/lib/api/client';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import toast from 'react-hot-toast';

export function useStudentProfile() {
  const { user } = useAuth();
  const studentId = user?.studentProfileId || user?.id;

  return useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline && studentId) {
        const student = await offlineDb.getStudentByIdOffline(studentId);
        if (student) {
          return {
            id: student.id,
            studentCode: student.studentCode,
            qrCodeToken: student.qrCodeToken,
            gradeLevel: student.gradeLevel,
            user: {
              fullName: student.fullName || student.user?.fullName || user?.fullName || 'طالب',
              phone: student.phone || student.user?.phone,
              email: student.email || student.user?.email,
            },
          };
        }
      }
      try {
        return await studentApi.getProfile(studentId!);
      } catch {
        if (studentId) {
          const student = await offlineDb.getStudentByIdOffline(studentId);
          if (student) {
            return {
              id: student.id,
              studentCode: student.studentCode,
              qrCodeToken: student.qrCodeToken,
              gradeLevel: student.gradeLevel,
              user: {
                fullName: student.fullName || student.user?.fullName || user?.fullName || 'طالب',
                phone: student.phone || student.user?.phone,
                email: student.email || student.user?.email,
              },
            };
          }
        }
        return null;
      }
    },
    enabled: !!studentId,
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
  });
}

export function useStudentCourses() {
  return useQuery({
    queryKey: ['student-courses'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getCoursesOffline();
      }
      try {
        const courses = await apiClient<any>('/courses/my-courses');
        if (courses && Array.isArray(courses) && courses.length > 0) {
          offlineDb.bulkPutCourses(courses);
        }
        return courses;
      } catch {
        return offlineDb.getCoursesOffline();
      }
    },
  });
}

export function useCourseDetails(courseId: string) {
  return useQuery({
    queryKey: ['student-course-details', courseId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const allCourses = await offlineDb.getCoursesOffline();
        return allCourses.find((c) => c.id === courseId) || null;
      }
      try {
        return await apiClient<any>(`/courses/${courseId}`);
      } catch {
        const allCourses = await offlineDb.getCoursesOffline();
        return allCourses.find((c) => c.id === courseId) || null;
      }
    },
    enabled: !!courseId,
  });
}

export function useLessonDetails(lessonId: string) {
  return useQuery({
    queryKey: ['student-lesson-details', lessonId],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const allCourses = await offlineDb.getCoursesOffline();
        for (const c of allCourses) {
          if (c.lessons) {
            const l = c.lessons.find((les: any) => les.id === lessonId);
            if (l) return l;
          }
        }
        return null;
      }
      try {
        return await apiClient<any>(`/courses/lessons/${lessonId}`);
      } catch {
        const allCourses = await offlineDb.getCoursesOffline();
        for (const c of allCourses) {
          if (c.lessons) {
            const l = c.lessons.find((les: any) => les.id === lessonId);
            if (l) return l;
          }
        }
        return null;
      }
    },
    enabled: !!lessonId,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lessonId,
      courseId,
      payload,
    }: {
      lessonId: string;
      courseId?: string;
      payload: { lastPositionSeconds: number; isCompleted: boolean };
    }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await syncEngine.enqueue(
          'progress',
          `/courses/lessons/${lessonId}/progress`,
          'POST',
          {
            lessonId,
            courseId,
            lastPositionSeconds: payload.lastPositionSeconds,
            isCompleted: payload.isCompleted,
          },
          { conflictStrategy: 'MONOTONIC' },
        );
        return { success: true, isOfflineSaved: true };
      }

      return apiClient<any>(`/courses/lessons/${lessonId}/progress`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data, variables) => {
      if (variables.courseId) {
        queryClient.invalidateQueries({ queryKey: ['student-course-details', variables.courseId] });
      }
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-lesson-details', variables.lessonId] });
    },
  });
}

export function useStudentAssessments() {
  return useQuery({
    queryKey: ['student-assessments'],
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
