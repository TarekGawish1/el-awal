import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  AssessmentListItem,
  AssessmentDetail,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
  AssessmentSubmissionListItem,
  AssessmentSubmissionDetail,
  GradeSubmissionPayload,
} from '../types/assessments.types';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function fetchAssessments(query?: Record<string, string>): Promise<PaginatedResponse<AssessmentListItem>> {
  return await apiClient<PaginatedResponse<AssessmentListItem>>(API_ENDPOINTS.ASSESSMENTS.LIST, {
    params: query,
  });
}

export async function fetchAssessmentById(id: string): Promise<AssessmentDetail> {
  return await apiClient<AssessmentDetail>(API_ENDPOINTS.ASSESSMENTS.DETAIL(id));
}

export async function createAssessment(payload: CreateAssessmentPayload): Promise<AssessmentDetail> {
  return await apiClient<AssessmentDetail>(API_ENDPOINTS.ASSESSMENTS.CREATE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAssessment(id: string, payload: UpdateAssessmentPayload): Promise<AssessmentDetail> {
  return await apiClient<AssessmentDetail>(API_ENDPOINTS.ASSESSMENTS.UPDATE(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchAssessmentSubmissions(id: string): Promise<AssessmentSubmissionListItem[]> {
  const res = await apiClient<any>(API_ENDPOINTS.ASSESSMENTS.SUBMISSIONS(id));
  return res.submissions || res;
}

export async function fetchSubmissionDetail(submissionId: string): Promise<AssessmentSubmissionDetail> {
  return await apiClient<AssessmentSubmissionDetail>(API_ENDPOINTS.ASSESSMENTS.SUBMISSION_DETAIL(submissionId));
}

export async function gradeSubmission(submissionId: string, payload: { manualGrades: { questionId: string; pointsEarned: number; teacherFeedback?: string }[]; feedback?: string }): Promise<any> {
  return await apiClient<any>(`${API_ENDPOINTS.ASSESSMENTS.SUBMISSION_DETAIL(submissionId)}/grade`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function submitAssessment(id: string, payload: { answers: { questionId: string; answerGiven: string }[] }): Promise<any> {
  return await apiClient<any>(API_ENDPOINTS.ASSESSMENTS.SUBMIT(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reEvaluateAssessmentSubmissions(id: string): Promise<any> {
  return await apiClient<any>(API_ENDPOINTS.ASSESSMENTS.RE_EVALUATE(id), {
    method: 'POST',
  });
}
