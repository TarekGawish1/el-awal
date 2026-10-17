import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../api/courses.api';
import toast from 'react-hot-toast';

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

export function useUpdateQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: { content: string } }) =>
      coursesApi.updateQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تم تحديث السؤال بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث السؤال');
    },
  });
}

export function useDeleteQuestion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => coursesApi.deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تم حذف السؤال بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف السؤال');
    },
  });
}

export function useUpdateReply(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, data }: { replyId: string; data: { content: string } }) =>
      coursesApi.updateReply(replyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تم تحديث الرد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث الرد');
    },
  });
}

export function useDeleteReply(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) => coursesApi.deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-questions', lessonId] });
      toast.success('تم حذف الرد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف الرد');
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

export function useLessonStreamAuth(lessonId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['lesson-stream-auth', lessonId],
    queryFn: () => coursesApi.getLessonStreamAuth(lessonId),
    enabled: options?.enabled !== undefined ? (!!lessonId && options.enabled) : !!lessonId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.videoStatus === 'PROCESSING') {
        return 8000;
      }
      return false;
    },
  });
}
