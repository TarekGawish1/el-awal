/**
 * Teacher Dashboard Domain Types & Filter State
 * Aligned with docs/03-Architecture/frontend-architecture.md and Dashboard Specification
 */

export type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

export type SessionStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface DashboardFilterState {
  academicYear: string;
  groupId: string; // 'ALL' or specific UUID
  dateRange: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export interface DashboardKpiData {
  todaySessionsCount: number;
  activeSessionsCount: number;
  totalActiveStudents: number;
  totalActiveGroups: number;
  weeklyAttendanceRate: number;
  attendanceRateDelta?: number; // e.g. +2.1
  pendingGradingCount: number;
  pendingGradingAssessmentsCount: number;
}

export interface TodaySessionItem {
  id: string;
  groupId: string;
  groupName: string;
  gradeLevel: string;
  startTime: string; // e.g. "17:00"
  endTime: string;   // e.g. "19:00"
  roomLocation?: string;
  status: SessionStatus;
  enrolledCount: number;
  presentCount: number;
  sessionDate?: string;
}

export interface AttendanceTrendPoint {
  period: string; // e.g. "الأسبوع 1" or "W32"
  rate: number;   // e.g. 92.4
  dateLabel?: string;
}

export interface AtRiskStudentAlert {
  id: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  consecutiveAbsences: number;
  lastAttendedDate?: string;
  parentPhone?: string;
}

export interface PendingGradingAlert {
  assessmentId: string;
  assessmentTitle: string;
  groupName: string;
  pendingCount: number;
  dueDate?: string;
  daysPending: number;
}

export interface GroupPerformanceItem {
  groupId: string;
  groupName: string;
  gradeLevel: string;
  enrolledCount: number;
  attendanceRate: number;
  averageExamScore: number;
}

export interface TeacherDashboardData {
  kpis: DashboardKpiData;
  todaySessions: TodaySessionItem[];
  attendanceTrends: AttendanceTrendPoint[];
  atRiskStudents: AtRiskStudentAlert[];
  pendingGradingList: PendingGradingAlert[];
  groupPerformance: GroupPerformanceItem[];
  lastUpdatedTimestamp: string;
}
