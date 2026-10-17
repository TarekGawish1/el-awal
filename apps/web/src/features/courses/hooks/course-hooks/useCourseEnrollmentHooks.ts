import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../api/courses.api';
import toast from 'react-hot-toast';

export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: () => coursesApi.getCourseEnrollments(courseId),
    enabled: !!courseId,
  });
}

export function useEnrollStudentsBatch(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) => coursesApi.enrollStudentsBatch(courseId, studentIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success(data.message || 'تم ضم الطلاب بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'تعذر ضم الطلاب للكورس');
    },
  });
}

export function useCreateAndEnrollStudent(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      fullName: string;
      phone: string;
      parentPhone: string;
      gradeLevel: string;
      academicStage?: string;
      groupId?: string;
    }) => coursesApi.createAndEnrollStudent(courseId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success(data.message || 'تم تسجيل الطالب وضمّه للكورس بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'تعذر تسجيل الطالب');
    },
  });
}

export function useEnrollByQrToken(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (qrToken: string) => coursesApi.enrollByQrToken(courseId, qrToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success(data.message || 'تم ضم الطالب عبر الـ QR بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'لم يتم العثور على طالب مطابق لرمز الـ QR');
    },
  });
}

export function useRevokeStudentEnrollment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => coursesApi.revokeStudentEnrollment(courseId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم إلغاء اشتراك الطالب من الكورس');
    },
    onError: () => {
      toast.error('تعذر إلغاء اشتراك الطالب');
    },
  });
}

export const useRevokeCourseAccess = useRevokeStudentEnrollment;

export function usePendingEnrollments(courseId: string) {
  return useQuery({
    queryKey: ['pending-enrollments', courseId],
    queryFn: () => coursesApi.getPendingEnrollments(courseId),
    enabled: !!courseId,
    refetchInterval: 10000,
  });
}

export function useApproveEnrollment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => coursesApi.approveEnrollment(enrollmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success(data.message || 'تم قبول وتفعيل اشتراك الطالب بنجاح 🎉');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر قبول الطلب');
    },
  });
}

export function useRejectEnrollment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) =>
      coursesApi.rejectEnrollment(enrollmentId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      toast.success(data.message || 'تم رفض طلب الاشتراك');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر رفض الطلب');
    },
  });
}
