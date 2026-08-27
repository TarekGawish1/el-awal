import { apiClient } from '@/lib/api/client';
import { StudentDetail } from '@/features/students/types/students.types';

export interface StudentDashboardStats {
  profile: StudentDetail;
  attendanceRate: number;
  upcomingSessions: any[];
  upcomingAssessments: any[];
  unpaidAmount: number;
}

export interface StudentGroupQuery {
  month?: number;
  year?: number;
}

export interface StudentGroupSession {
  id: string;
  groupId: string;
  scheduleId?: string | null;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  topic?: string | null;
  isCancelled: boolean;
  cancellationReason?: string | null;
  attendance?: {
    status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
    recordingMethod?: 'QR_SCAN' | 'MANUAL';
    recordedAt?: string;
    notes?: string | null;
  } | null;
  assessment?: {
    id: string;
    title: string;
    description?: string | null;
    type?: string | null;
    totalScore: number;
    dueDate?: string | null;
    submission?: {
      status: 'SUBMITTED' | 'GRADED' | 'UNSOLVED';
      scoreObtained?: number | null;
      fileKey?: string | null;
      attachmentUrl?: string | null;
      studentNotes?: string | null;
      submittedAt?: string;
      teacherFeedback?: string | null;
    } | null;
  } | null;
  educationalContents: Array<{
    id: string;
    title: string;
    description?: string | null;
    contentType: string;
    fileUrl: string;
    downloadUrl?: string;
    fileKey: string;
    fileSize?: number | null;
    mimeType?: string | null;
    createdAt: string;
  }>;
  location?: string | null;
}

export interface StudentGroupDetails {
  group: {
    id: string;
    name: string;
    gradeLevel: string;
    academicYear: string;
    academicTerm: string;
    monthlyFee: number;
    description?: string | null;
    schedules: Array<{
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      location?: string | null;
    }>;
  };
  teacher: {
    id: string;
    fullName: string;
    specialty?: string | null;
    bio?: string | null;
  };
  subscription: {
    year: number;
    month: number;
    amountExpected: number;
    amountPaid: number;
    paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'EXEMPT' | 'REFUNDED';
    isPaid: boolean;
  };
}

export const studentApi = {
  getProfile: async (studentId: string) => {
    return apiClient<StudentDetail>(`/students/${studentId}`);
  },
  
  getQrCode: async (studentId: string) => {
    return apiClient<any>(`/students/${studentId}/qr-code`);
  },

  getMyGroup: async (params?: StudentGroupQuery) => {
    return apiClient<StudentGroupDetails>('/students/my-group', { params: params as Record<string, string | number | boolean | undefined> });
  },

  getMyGroupSessions: async (params?: StudentGroupQuery) => {
    return apiClient<StudentGroupSession[]>('/students/my-group/sessions', { params: params as Record<string, string | number | boolean | undefined> });
  },

  generateHomeworkUploadUrl: async (payload: { fileName: string; contentType: string; fileSizeBytes: number }) => {
    return apiClient<{ uploadUrl: string; fileKey: string; publicUrl: string; expiresInSeconds: number }>('/content/presigned-upload-url', {
      method: 'POST',
      body: JSON.stringify({ ...payload, folder: 'homework-submissions' }),
    });
  },

  submitHomework: async (assessmentId: string, payload: { sessionId: string; fileKey: string; fileUrl: string; studentNotes?: string }) => {
    return apiClient<any>(`/assessments/${assessmentId}/submit-homework`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAvailableGroups: async () => {
    return apiClient<any[]>('/students/my-group/available-groups');
  },

  reserveGroup: async (groupId: string) => {
    return apiClient<any>(`/students/my-group/reserve/${groupId}`, {
      method: 'POST',
    });
  },
};
