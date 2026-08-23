import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../api/courses.api';
import { CourseDetail, CourseModule, CourseLesson } from '../types/courses.types';
import toast from 'react-hot-toast';

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
    onError: () => {
      toast.error('تعذر إنشاء الكورس');
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
    onError: () => {
      toast.error('تعذر تحديث بيانات الكورس');
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
    onError: () => {
      toast.error('تعذر حذف الكورس');
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
    onError: () => {
      toast.error('تعذر منح صلاحية الوصول للمجموعات');
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
    onError: () => {
      toast.error('تعذر إضافة الوحدة');
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
    onError: () => {
      toast.error('تعذر تحديث الوحدة');
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
    onError: () => {
      toast.error('تعذر حذف الوحدة');
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
    onError: () => {
      toast.error('تعذر إضافة الدرس');
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
    onError: () => {
      toast.error('تعذر تحديث الدرس');
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
    onError: () => {
      toast.error('تعذر حذف الدرس');
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
    onError: () => {
      toast.error('تعذر إرفاق الملف');
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
    onError: () => {
      toast.error('تعذر حذف المرفق');
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
      toast.success('تم طرح سؤالك بنجاح');
    },
    onError: () => {
      toast.error('تعذر نشر السؤال');
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
      toast.success('تمت إضافة الرد');
    },
    onError: () => {
      toast.error('تعذر إرسال الرد');
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
