import { apiClient } from '@/lib/api/client';

export const coursesEnrollmentsApi = {
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
    unsubscribedStudents: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      studentPhone: string;
      parentPhone: string;
      parentName: string;
      gradeLevel: string;
      date: string;
      createdAt: string;
    }>;
    counts: {
      pending: number;
      active: number;
      unsubscribed: number;
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
};
