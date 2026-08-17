import { apiClient } from '@/lib/api/client';
import { User, StudentProfile } from '@/features/students/types/students.types';

export interface StudentDashboardStats {
  profile: StudentProfile & { user: User };
  attendanceRate: number;
  upcomingSessions: any[];
  upcomingAssessments: any[];
  unpaidAmount: number;
}

export const studentApi = {
  getProfile: async (studentId: string) => {
    return apiClient.get(`/students/${studentId}`);
  },
  
  getQrCode: async (studentId: string) => {
    return apiClient.get(`/students/${studentId}/qr-code`);
  },
};
