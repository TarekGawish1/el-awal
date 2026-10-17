import { apiClient } from '@/lib/api/client';
import {
  LessonQuestion,
  LessonQuestionReply,
  LessonViewerData,
} from '../types/courses.types';

export const coursesQaViewerApi = {
  // Timestamped Q&A
  getLessonQuestions: async (lessonId: string): Promise<LessonQuestion[]> => {
    return apiClient<LessonQuestion[]>(`/courses/lessons/${lessonId}/questions`);
  },

  createQuestion: async (lessonId: string, data: { content: string; videoTimestamp?: number }): Promise<LessonQuestion> => {
    return apiClient<LessonQuestion>(`/courses/lessons/${lessonId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createReply: async (questionId: string, data: { content: string }): Promise<LessonQuestionReply> => {
    return apiClient<LessonQuestionReply>(`/courses/questions/${questionId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestion: async (questionId: string, data: { content: string }): Promise<LessonQuestion> => {
    return apiClient<LessonQuestion>(`/courses/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion: async (questionId: string): Promise<void> => {
    return apiClient<void>(`/courses/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  updateReply: async (replyId: string, data: { content: string }): Promise<LessonQuestionReply> => {
    return apiClient<LessonQuestionReply>(`/courses/questions/replies/${replyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteReply: async (replyId: string): Promise<void> => {
    return apiClient<void>(`/courses/questions/replies/${replyId}`, {
      method: 'DELETE',
    });
  },

  // Student Lesson Viewer & DRM Stream Auth
  getLessonViewer: async (lessonId: string): Promise<LessonViewerData> => {
    return apiClient<LessonViewerData>(`/courses/lessons/${lessonId}`);
  },

  getLessonStreamAuth: async (lessonId: string): Promise<{
    lessonId: string;
    courseId: string;
    title: string;
    videoId: string;
    videoStatus?: 'READY' | 'PROCESSING' | 'ERROR';
    embedUrl: string;
    playbackUrl: string;
    isPreview: boolean;
    watermark: {
      studentName: string;
      studentPhone: string;
      studentCode: string;
    };
  }> => {
    return apiClient(`/courses/lessons/${lessonId}/stream-auth`);
  },

  getLessonStreamTicket: async (lessonId: string): Promise<{ embedUrl: string; expiresAt: number }> => {
    return apiClient.get(`/courses/lessons/${lessonId}/stream-ticket`);
  },

  updateLessonProgress: async (lessonId: string, data: { lastPositionSeconds: number; isCompleted?: boolean }): Promise<any> => {
    return apiClient(`/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
