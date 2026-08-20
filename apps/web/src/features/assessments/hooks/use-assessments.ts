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
import { offlineDb } from '@/lib/offline/db';

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
    mutationFn: (payload: CreateAssessmentPayload) => createAssessment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssessmentPayload }) =>
      updateAssessment(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
    },
  });
}

export function useAssessmentSubmissions(id: string) {
  return useQuery({
    queryKey: assessmentKeys.submissions(id),
    queryFn: () => fetchAssessmentSubmissions(id),
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
    mutationFn: ({
      submissionId,
      payload,
    }: {
      submissionId: string;
      payload: GradeSubmissionPayload;
    }) => gradeSubmission(submissionId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissionDetail(variables.submissionId) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.details() });
    },
  });
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => submitAssessment(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
    },
  });
}
