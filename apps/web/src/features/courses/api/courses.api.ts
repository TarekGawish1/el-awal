import { apiClient } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { translateErrorMessage } from '@/lib/api/errors';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
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
    moduleId?: string;
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

  // Server-Side Fallback Direct Video Upload to Bunny Stream (Bypasses browser CORS, Brave Shields, and network blocks)
  uploadVideoDirectToServer: async (
    file: File,
    title?: string,
    onProgress?: (percent: number, loaded: number, total: number) => void,
  ): Promise<{
    videoId: string;
    embedUrl: string;
    provider: 'bunny';
    playbackUrl?: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/courses/lessons/upload-video-stream`;
      xhr.open('POST', url);

      const token = getStoredAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('Accept', 'application/json');

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            const data = json?.data || json;
            resolve({
              videoId: data.videoId,
              embedUrl: data.embedUrl,
              playbackUrl: data.playbackUrl,
              provider: 'bunny',
            });
          } catch {
            resolve(JSON.parse(xhr.responseText));
          }
        } else {
          let errorMsg = `تعذر رفع الفيديو إلى سيرفر البث السحابي (كود: ${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj?.message) errorMsg = errObj.message;
          } catch {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('تعذر الاتصال بالسيرفر أثناء رفع الفيديو إلى Bunny Stream.'));
      };
      xhr.onabort = () => reject(new Error('تم إلغاء رفع الفيديو'));

      xhr.send(formData);
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

  submitSubscriptionRequest: async (
    courseId: string,
    data: {
      senderPhone?: string;
      transferAmount?: number;
      receiptImageUrl?: string;
      paymentMethod?: string;
    },
  ): Promise<{
    enrollmentId: string;
    courseId: string;
    studentId: string;
    status: string;
    message: string;
  }> => {
    return apiClient(`/courses/${courseId}/subscribe-request`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPendingEnrollments: async (courseId: string): Promise<Array<{
    enrollmentId: string;
    courseId: string;
    studentId: string;
    fullName: string;
    studentCode: string;
    phone: string;
    parentPhone?: string;
    senderPhone?: string;
    transferAmount: number;
    receiptImageUrl?: string;
    paymentMethod: string;
    enrolledAt: string;
    status: string;
  }>> => {
    return apiClient(`/courses/${courseId}/pending-enrollments`);
  },

  approveEnrollment: async (enrollmentId: string): Promise<{
    enrollmentId: string;
    courseId: string;
    studentId: string;
    status: string;
    accessStatus: string;
    message: string;
  }> => {
    return apiClient(`/courses/enrollments/${enrollmentId}/approve`, {
      method: 'POST',
    });
  },

  rejectEnrollment: async (
    enrollmentId: string,
    rejectionReason?: string,
  ): Promise<{
    enrollmentId: string;
    status: string;
    rejectionReason?: string;
    message: string;
  }> => {
    return apiClient(`/courses/enrollments/${enrollmentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  cancelEnrollment: async (
    enrollmentId: string,
    reason?: string,
  ): Promise<{
    enrollmentId: string;
    status: string;
    message: string;
  }> => {
    return apiClient(`/courses/enrollments/${enrollmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  getTeacherSubscriptions: async (): Promise<{
    pendingRequests: Array<{
      enrollmentId: string;
      courseId: string;
      courseName: string;
      coursePrice: number;
      studentId: string;
      studentName: string;
      studentCode: string;
      studentPhone: string;
      senderPhone: string;
      transferAmount: number;
      receiptImageUrl?: string | null;
      paymentMethod: string;
      date: string;
      enrolledAt: string;
      status: string;
    }>;
    activeStudents: Array<{
      enrollmentId: string;
      courseId: string;
      courseName: string;
      coursePrice: number;
      studentId: string;
      studentName: string;
      studentCode: string;
      studentPhone: string;
      senderPhone: string;
      transferAmount: number;
      receiptImageUrl?: string | null;
      paymentMethod: string;
      date: string;
      enrolledAt: string;
      status: string;
    }>;
    counts: {
      pending: number;
      active: number;
    };
  }> => {
    return apiClient('/courses/teacher/subscriptions');
  },

  getSubscriptionStatus: async (courseId: string): Promise<{
    isEnrolled: boolean;
    status: string | null;
    senderPhone?: string | null;
    transferAmount?: number | null;
    receiptImageUrl?: string | null;
    rejectionReason?: string | null;
    enrolledAt?: string | null;
    reviewedAt?: string | null;
  }> => {
    return apiClient(`/courses/${courseId}/subscription-status`);
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
    const mimeType = file.type || 'application/octet-stream';
    const presigned = await coursesApi.getPresignedUploadUrl({
      fileName: file.name,
      contentType: mimeType,
      fileType: mimeType,
      fileSizeBytes: file.size,
      folder,
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presigned.uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            fileUrl: presigned.publicUrl,
            fileKey: presigned.fileKey,
            fileSize: file.size,
            fileType: mimeType,
            fileName: file.name,
          });
        } else {
          reject(new Error(`فشل رفع الملف إلى التخزين السحابي (كود: ${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('تعذر الاتصال بخادم التخزين السحابي أثناء الرفع. يرجى التحقق من اتصالك بالإنترنت.'));
      xhr.onabort = () => reject(new Error('تم إلغاء عملية الرفع'));
      xhr.send(file);
    });
  },

  deleteUploadedFile: async (fileKeyOrUrl?: string | null): Promise<{ success: boolean }> => {
    if (!fileKeyOrUrl) return { success: true };
    try {
      return await apiClient('/content/file', {
        method: 'DELETE',
        body: JSON.stringify(
          fileKeyOrUrl.startsWith('http') || fileKeyOrUrl.startsWith('/')
            ? { fileUrl: fileKeyOrUrl }
            : { fileKey: fileKeyOrUrl }
        ),
      });
    } catch (err) {
      console.warn('Failed to delete file from storage:', err);
      return { success: false };
    }
  },
};


