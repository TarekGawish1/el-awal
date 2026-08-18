import { apiClient } from '@/lib/api/client';
import { StudentDetail } from '@/features/students/types/students.types';

export interface StudentDashboardStats {
  profile: StudentDetail;
  attendanceRate: number;
  upcomingSessions: any[];
  upcomingAssessments: any[];
  unpaidAmount: number;
}

export const studentApi = {
  getProfile: async (studentId: string) => {
    return apiClient<StudentDetail>(`/students/${studentId}`);
  },
  
  getQrCode: async (studentId: string) => {
    return apiClient<any>(`/students/${studentId}/qr-code`);
  },
};
