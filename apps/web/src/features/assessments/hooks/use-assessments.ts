import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAssessments,
  fetchAssessmentById,
  createAssessment,
  updateAssessment,
  fetchAssessmentSubmissions,
  fetchSubmissionDetail,
  gradeSubmission,
  submitAssessment,
} from '../api/assessments.api';
import {
  AssessmentListItem,
  AssessmentDetail,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
  GradeSubmissionPayload,
} from '../types/assessments.types';
import { offlineDb, AssessmentEntity } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { generateUUIDv7 } from '@/lib/offline/uuid';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export const assessmentKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentKeys.all, 'list'] as const,
  list: (filters: string) => [...assessmentKeys.lists(), { filters }] as const,
  details: () => [...assessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
  submissions: (id: string) => [...assessmentKeys.detail(id), 'submissions'] as const,
  submissionDetail: (submissionId: string) => [...assessmentKeys.all, 'submission', submissionId] as const,
};

export function useAssessments(query?: Record<string, string>) {
  return useQuery({
    queryKey: assessmentKeys.list(JSON.stringify(query)),
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineList = await offlineDb.getAssessmentsOffline();
        return {
          data: offlineList as unknown as AssessmentListItem[],
          meta: { total: offlineList.length },
        };
      }

      try {
        const res = await fetchAssessments(query);
        if (res?.data && res.data.length > 0) {
          offlineDb.bulkPutAssessments(res.data as any);
        }
        return res;
      } catch {
        const offlineList = await offlineDb.getAssessmentsOffline();
        return {
          data: offlineList as unknown as AssessmentListItem[],
          meta: { total: offlineList.length },
        };
      }
    },
  });
}

export function useAssessment(id: string) {
  return useQuery<AssessmentDetail | null>({
    queryKey: assessmentKeys.detail(id),
    queryFn: async (): Promise<AssessmentDetail | null> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const assessments = await offlineDb.getAssessmentsOffline();
        const found = assessments.find((a) => a.id === id) || null;
        return found as unknown as AssessmentDetail | null;
      }
      try {
        return await fetchAssessmentById(id);
      } catch {
        const assessments = await offlineDb.getAssessmentsOffline();
        const found = assessments.find((a) => a.id === id) || null;
        return found as unknown as AssessmentDetail | null;
      }
    },
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAssessmentPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const newId = generateUUIDv7();
        const assessmentEntity: AssessmentEntity = {
          id: newId,
          title: payload.title,
          type: payload.type || 'EXAM',
          description: payload.description,
          totalScore: payload.totalScore,
          passingScore: payload.passingScore,
          durationMinutes: payload.durationMinutes,
          dueDate: payload.dueDate,
          isPublished: payload.isPublished ?? true,
          questions: (payload.questions || []).map((q, idx) => ({
            id: generateUUIDv7(),
            questionNumber: idx + 1,
            questionText: q.questionText,
            questionType: q.questionType,
            optionsData: q.optionsData,
            points: q.points,
            correctAnswer: q.correctAnswer,
          })),
          submissions: [],
        };

        await offlineDb.bulkPutAssessments([assessmentEntity]);

        await syncEngine.enqueue(
          'assessments',
          API_ENDPOINTS.ASSESSMENTS.CREATE,
          'POST',
          { ...payload, id: newId, clientGeneratedId: newId },
          { optimisticId: newId },
        );

        toast.success('تم حفظ الاختبار والأسئلة محلياً بنجاح ووضعها في انتظار المزامنة 💾');
        return assessmentEntity as unknown as AssessmentDetail;
      }

      return createAssessment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAssessmentPayload }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const assessments = await offlineDb.getAssessmentsOffline();
        const existing = assessments.find((a) => a.id === id);
        if (existing) {
          const updated: AssessmentEntity = {
            ...existing,
            title: payload.title ?? existing.title,
            description: payload.description ?? existing.description,
            totalScore: payload.totalScore ?? existing.totalScore,
            passingScore: payload.passingScore ?? existing.passingScore,
            durationMinutes: payload.durationMinutes ?? existing.durationMinutes,
            dueDate: payload.dueDate ?? existing.dueDate,
            isPublished: payload.isPublished ?? existing.isPublished,
          };
          await offlineDb.bulkPutAssessments([updated]);
        }

        await syncEngine.enqueue(
          'assessments',
          API_ENDPOINTS.ASSESSMENTS.UPDATE(id),
          'PATCH',
          payload,
        );

        toast.success('تم تعديل الاختبار محلياً بنجاح 💾');
        return { id, ...payload } as unknown as AssessmentDetail;
      }

      return updateAssessment(id, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
    },
  });
}

export function useAssessmentSubmissions(id: string) {
  return useQuery({
    queryKey: assessmentKeys.submissions(id),
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const draft = await offlineDb.getAssessmentDraft(id);
        if (draft && draft.isSubmitted) {
          return [{
            id: `offline-sub-${id}`,
            assessmentId: id,
            status: 'SUBMITTED',
            submittedAt: new Date(draft.submittedAt || Date.now()).toISOString(),
            scoreObtained: draft.localScore ?? null,
            student: { id: 'current', fullName: 'الطالب' },
          }];
        }
        return [];
      }
      try {
        return await fetchAssessmentSubmissions(id);
      } catch {
        const draft = await offlineDb.getAssessmentDraft(id);
        if (draft && draft.isSubmitted) {
          return [{
            id: `offline-sub-${id}`,
            assessmentId: id,
            status: 'SUBMITTED',
            submittedAt: new Date(draft.submittedAt || Date.now()).toISOString(),
            scoreObtained: draft.localScore ?? null,
            student: { id: 'current', fullName: 'الطالب' },
          }];
        }
        return [];
      }
    },
    enabled: !!id,
  });
}

export function useSubmissionDetail(submissionId: string) {
  return useQuery({
    queryKey: assessmentKeys.submissionDetail(submissionId),
    queryFn: () => fetchSubmissionDetail(submissionId),
    enabled: !!submissionId,
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      payload,
    }: {
      submissionId: string;
      payload: GradeSubmissionPayload;
    }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await syncEngine.enqueue(
          'assessments',
          API_ENDPOINTS.ASSESSMENTS.GRADE_SUBMISSION(submissionId),
          'POST',
          payload,
        );
        toast.success('تم حفظ التقييم والدرجات محلياً في انتظار المزامنة 💾');
        return { success: true };
      }

      return gradeSubmission(submissionId, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissionDetail(variables.submissionId) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.details() });
    },
  });
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const assessments = await offlineDb.getAssessmentsOffline();
        const assessment = assessments.find((a) => a.id === id);

        // Auto-grade objective questions offline if answer keys available
        let localScore = 0;
        if (assessment && assessment.questions) {
          for (const ans of (payload.answers || [])) {
            const q = assessment.questions.find((quest) => quest.id === ans.questionId);
            if (q && q.correctAnswer && (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'TRUE_FALSE')) {
              if (String(ans.selectedAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
                localScore += Number(q.points || 1);
              }
            }
          }
        }

        await offlineDb.saveAssessmentDraft({
          assessmentId: id,
          title: assessment?.title || 'اختبار',
          totalScore: assessment?.totalScore || 100,
          questions: assessment?.questions || [],
          draftAnswers: (payload.answers || []).reduce((acc: any, curr: any) => {
            acc[curr.questionId] = curr.selectedAnswer;
            return acc;
          }, {}),
          isSubmitted: true,
          submittedAt: Date.now(),
          localScore,
          updatedAt: Date.now(),
        });

        await syncEngine.enqueue(
          'assessments',
          API_ENDPOINTS.ASSESSMENTS.SUBMIT(id),
          'POST',
          {
            assessmentId: id,
            answers: payload.answers || [],
            attachmentUrl: payload.attachmentUrl,
          },
        );

        toast.success('تم تسليم الإجابات بنجاح وحفظها محلياً وسيتم إرسالها فور عودة الاتصال 💾');
        return { success: true, localScore, isOfflineSaved: true };
      }

      return submitAssessment(id, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissions(variables.id) });
    },
  });
}
