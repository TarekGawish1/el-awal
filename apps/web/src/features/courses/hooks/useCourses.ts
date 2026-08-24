import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../api/courses.api';
import { CourseDetail, CourseModule, CourseLesson } from '../types/courses.types';
import toast from 'react-hot-toast';

/**
 * Maps backend validation/permission errors to Arabic-only messages.
 * Never surfaces raw English backend messages to the user.
 */
function getArabicReorderError(err: any): string {
  const status = err?.statusCode ?? err?.response?.status ?? err?.status;
  if (status === 403) return 'ليس لديك صلاحية لتعديل ترتيب هذا الكورس';
  if (status === 404) return 'لم يتم العثور على الكورس أو الدروس المطلوبة';
  if (status === 400 || status === 422) return 'بيانات الترتيب غير صالحة، حاول مرة أخرى';
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return 'لا يوجد اتصال بالإنترنت، سيتم حفظ التغييرات عند عودة الاتصال';
  return 'تعذر تحديث ترتيب الدروس';
}


export function useTeacherCourses() {
  return useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => coursesApi.getTeacherCourses(),
  });
}

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: () => coursesApi.getCourseDetails(courseId),
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CourseDetail>) => coursesApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم إنشاء الكورس بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إنشاء الكورس');
    },
  });
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CourseDetail>) => coursesApi.updateCourse(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم حفظ تعديلات الكورس');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث بيانات الكورس');
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => coursesApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم حذف الكورس بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف الكورس');
    },
  });
}

export function useGrantGroupAccess(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupIds: string[]) => coursesApi.grantGroupAccess(courseId, groupIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم منح صلاحية الوصول لطلاب المجموعات المحددة');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر منح صلاحية الوصول للمجموعات');
    },
  });
}

export function useCreateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; unitQuizId?: string }) =>
      coursesApi.createModule(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تمت إضافة الوحدة بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إضافة الوحدة');
    },
  });
}

export function useUpdateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: { title?: string; description?: string; orderIndex?: number; unitQuizId?: string | null } }) =>
      coursesApi.updateModule(moduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم تحديث بيانات الوحدة');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث الوحدة');
    },
  });
}

export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => coursesApi.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم حذف الوحدة');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف الوحدة');
    },
  });
}

export function useReorderModules(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleOrders: Array<{ moduleId: string; orderIndex: number }>) =>
      coursesApi.reorderModules(courseId, moduleOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم حفظ ترتيب الوحدات');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.error('تعذر حفظ ترتيب الوحدات، حاول مرة أخرى');
    },
  });
}

export function useCreateLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: any }) =>
      coursesApi.createLesson(moduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تمت إضافة الدرس بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إضافة الدرس');
    },
  });
}

export function useReorderLessons(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonOrders: Array<{ lessonId: string; orderIndex: number; moduleId?: string }>) =>
      coursesApi.reorderLessons(courseId, lessonOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم تحديث ترتيب الدروس');
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.error(getArabicReorderError(err));
    },
  });
}

export function useUpdateLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: any }) =>
      coursesApi.updateLesson(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم تحديث الدرس');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث الدرس');
    },
  });
}

export function useDeleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => coursesApi.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم حذف الدرس');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف الدرس');
    },
  });
}

export function useAddAttachment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: any }) =>
      coursesApi.addAttachment(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم إرفاق الملف بالدرس');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إرفاق الملف');
    },
  });
}

export function useDeleteAttachment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => coursesApi.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
      toast.success('تم حذف المرفق');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف المرفق');
    },
  });
}

export function useLessonQuestions(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-questions', lessonId],
    queryFn: () => coursesApi.getLessonQuestions(lessonId),
    enabled: !!lessonId,
    refetchInterval: 15000,
  });
}

export function useCreateQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; videoTimestamp?: number }) =>
      coursesApi.createQuestion(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تم نشر سؤالك بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر نشر السؤال');
    },
  });
}

export function useCreateReply(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: { content: string } }) =>
      coursesApi.createReply(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تمت إضافة الرد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إرسال الرد');
    },
  });
}

export function useLessonViewer(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-viewer', lessonId],
    queryFn: () => coursesApi.getLessonViewer(lessonId),
    enabled: !!lessonId,
  });
}

export function useLessonStreamAuth(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-stream-auth', lessonId],
    queryFn: () => coursesApi.getLessonStreamAuth(lessonId),
    enabled: !!lessonId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.videoStatus === 'PROCESSING') {
        return 8000;
      }
      return false;
    },
  });
}

// Enrollment Hooks
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
