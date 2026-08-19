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
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
  GradeSubmissionPayload,
} from '../types/assessments.types';

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
    queryFn: () => fetchAssessments(query),
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => fetchAssessmentById(id),
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
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
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
    mutationFn: ({ submissionId, payload }: { submissionId: string; payload: GradeSubmissionPayload }) =>
      gradeSubmission(submissionId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissionDetail(variables.submissionId) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissions(data.assessmentId) });
    },
  });
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { answers: { questionId: string; answerGiven: string }[] } }) =>
      submitAssessment(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}
