import { apiClient } from '@/lib/api/client';
import {
  CourseDetail,
  CourseModule,
  CourseLesson,
  LessonAttachment,
} from '../types/courses.types';

export const coursesCoreApi = {
  // Course Management
  getTeacherCourses: async (): Promise<CourseDetail[]> => {
    return apiClient<CourseDetail[]>('/courses/teacher');
  },

  getCourseDetails: async (courseId: string): Promise<CourseDetail> => {
    return apiClient<CourseDetail>(`/courses/${courseId}`);
  },

  createCourse: async (data: Partial<CourseDetail>): Promise<CourseDetail> => {
    return apiClient<CourseDetail>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCourse: async (courseId: string, data: Partial<CourseDetail>): Promise<CourseDetail> => {
    return apiClient<CourseDetail>(`/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    return apiClient<void>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  grantGroupAccess: async (courseId: string, groupIds: string[]): Promise<{ courseId: string; groupsGranted: number }> => {
    return apiClient(`/courses/${courseId}/group-access`, {
      method: 'POST',
      body: JSON.stringify({ groupIds }),
    });
  },

  // Modules / Chapters
  createModule: async (courseId: string, data: { title: string; description?: string; unitQuizId?: string }): Promise<CourseModule> => {
    return apiClient<CourseModule>(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateModule: async (moduleId: string, data: { title?: string; description?: string; orderIndex?: number; unitQuizId?: string | null }): Promise<CourseModule> => {
    return apiClient<CourseModule>(`/courses/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteModule: async (moduleId: string): Promise<void> => {
    return apiClient<void>(`/courses/modules/${moduleId}`, {
      method: 'DELETE',
    });
  },

  reorderModules: async (courseId: string, moduleOrders: Array<{ moduleId: string; orderIndex: number }>): Promise<any> => {
    return apiClient('/courses/modules/reorder', {
      method: 'POST',
      body: JSON.stringify({ courseId, moduleOrders }),
    });
  },

  reorderLessons: async (
    courseId: string,
    lessonOrders: Array<{ lessonId: string; orderIndex: number; moduleId?: string }>,
  ): Promise<any> => {
    return apiClient('/courses/lessons/reorder', {
      method: 'POST',
      body: JSON.stringify({ courseId, lessonOrders }),
    });
  },

  // Lessons
  createLesson: async (moduleId: string, data: {
    title: string;
    description?: string;
    summary?: string;
    lessonType?: string;
    bunnyVideoId?: string;
    contentUrl?: string;
    videoDurationSeconds?: number;
    isFreePreview?: boolean;
    isPreview?: boolean;
    lessonQuizId?: string | null;
    quizId?: string | null;
    homeworkId?: string | null;
    lessonHomeworkId?: string | null;
    attachments?: any[];
  }): Promise<CourseLesson> => {
    return apiClient<CourseLesson>(`/courses/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLesson: async (lessonId: string, data: {
    title?: string;
    description?: string;
    summary?: string;
    lessonType?: string;
    bunnyVideoId?: string;
    contentUrl?: string;
    videoDurationSeconds?: number;
    isFreePreview?: boolean;
    isPreview?: boolean;
    lessonQuizId?: string | null;
    quizId?: string | null;
    homeworkId?: string | null;
    lessonHomeworkId?: string | null;
    moduleId?: string;
    attachments?: any[];
  }): Promise<CourseLesson> => {
    return apiClient<CourseLesson>(`/courses/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteLesson: async (lessonId: string): Promise<void> => {
    return apiClient<void>(`/courses/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  // Attachments
  addAttachment: async (lessonId: string, data: {
    title: string;
    fileUrl: string;
    fileKey: string;
    fileSize?: number;
    fileType?: string;
  }): Promise<LessonAttachment> => {
    return apiClient<LessonAttachment>(`/courses/lessons/${lessonId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    return apiClient<void>(`/courses/lessons/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },
};
