import { apiClient } from '@/lib/api/client';
import {
  CourseDetail,
  CourseModule,
  CourseLesson,
  LessonAttachment,
  LessonQuestion,
  LessonQuestionReply,
  DirectUploadCredentials,
  LessonViewerData,
} from '../types/courses.types';

export const coursesApi = {
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
    lessonQuizId?: string;
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
    lessonQuizId?: string | null;
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

  // Direct Bunny Video Upload Credentials
  getVideoUploadCredentials: async (title: string): Promise<DirectUploadCredentials> => {
    return apiClient<DirectUploadCredentials>('/courses/lessons/upload-video-credentials', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

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

  updateLessonProgress: async (lessonId: string, data: { lastPositionSeconds: number; isCompleted?: boolean }): Promise<any> => {
    return apiClient(`/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Enrollments Suite
  getCourseEnrollments: async (courseId: string): Promise<Array<{
    id: string;
    studentId: string;
    studentCode: string;
    fullName: string;
    phone: string;
    gradeLevel: string;
    status: string;
    enrolledAt: string;
    groups: string[];
  }>> => {
    return apiClient(`/courses/${courseId}/enrollments`);
  },

  enrollStudentsBatch: async (courseId: string, studentIds: string[]): Promise<{ success: boolean; enrolledCount: number; message: string }> => {
    return apiClient(`/courses/${courseId}/enroll-students`, {
      method: 'POST',
      body: JSON.stringify({ studentIds }),
    });
  },

  createAndEnrollStudent: async (courseId: string, data: {
    fullName: string;
    phone: string;
    parentPhone: string;
    gradeLevel: string;
    academicStage?: string;
    groupId?: string;
  }): Promise<any> => {
    return apiClient(`/courses/${courseId}/create-and-enroll-student`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  enrollByQrToken: async (courseId: string, qrToken: string): Promise<{ success: boolean; student: any; message: string }> => {
    return apiClient(`/courses/${courseId}/enroll-by-qr`, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  },

  revokeStudentEnrollment: async (courseId: string, studentId: string): Promise<any> => {
    return apiClient(`/courses/${courseId}/enrollments/${studentId}`, {
      method: 'DELETE',
    });
  },

  getPresignedUploadUrl: async (data: {
    fileName: string;
    contentType?: string;
    fileType?: string;
    fileSizeBytes?: number;
    folder?: string;
  }): Promise<{
    uploadUrl: string;
    publicUrl: string;
    fileKey: string;
    expiresInSeconds: number;
  }> => {
    return apiClient('/content/presigned-upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  uploadDirectFile: async (
    file: File,
    folder = 'courses',
    onProgress?: (percent: number) => void,
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    fileName: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      xhr.open('POST', `${apiUrl}/content/upload-file`);

      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
            : null;
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      } catch {}

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            const data = parsed?.data || parsed;
            resolve(data);
          } catch {
            resolve({
              fileUrl: URL.createObjectURL(file),
              fileKey: `file_${Date.now()}`,
              fileSize: file.size,
              fileType: file.type,
              fileName: file.name,
            });
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during direct upload'));
      xhr.send(formData);
    });
  },
};


