import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/features/courses/api/courses.api';
import { apiClient } from '@/lib/api/client';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { translateErrorMessage } from '@/lib/api/errors';
import toast from 'react-hot-toast';

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

export function useEnrollInCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      return apiClient(`/courses/${courseId}/enroll`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      toast.success('تم تفعيل الاشتراك في الكورس بنجاح! يمكنك الآن بدء التعلم.');
    },
    onError: (err: any) => {
      toast.error(translateErrorMessage(err?.message) || 'تعذر إتمام الاشتراك في الكورس. يرجى المحاولة مرة أخرى.');
    },
  });
}

export function useSubmitCourseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: string;
      data: {
        senderPhone?: string;
        transferAmount?: number;
        receiptImageUrl?: string;
        paymentMethod?: string;
      };
    }) => {
      return coursesApi.submitSubscriptionRequest(courseId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', variables.courseId] });
      toast.success('تم إرسال طلب الاشتراك وإيصال التحويل بنجاح! سيتم مراجعة المعلم وتفعيل الكورس فوراً 🚀');
    },
    onError: (err: any) => {
      toast.error(
        translateErrorMessage(err?.message) ||
          'تعذر إرسال طلب الاشتراك. يرجى مراجعة البيانات والمحاولة مجدداً.',
      );
    },
  });
}

export function useCourseSubscriptionStatus(courseId: string) {
  return useQuery({
    queryKey: ['subscription-status', courseId],
    queryFn: () => coursesApi.getSubscriptionStatus(courseId),
    enabled: !!courseId,
    refetchInterval: 15000,
  });
}
