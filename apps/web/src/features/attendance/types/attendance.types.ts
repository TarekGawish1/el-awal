export interface LessonSession {
  id: string;
  groupId: string;
  scheduleId?: string;
  sessionDate: string;
  startTime?: string;
  topic?: string;
  _count?: {
    attendanceRecords: number;
  };
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
export type RecordingMethod = 'QR' | 'MANUAL';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  phone?: string;
  status: AttendanceStatus;
  recordingMethod: RecordingMethod;
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

export interface SessionReportMetrics {
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRatePercentage: number;
}

export interface SessionReport {
  sessionId: string;
  sessionDate: string;
  topic: string;
  groupId: string;
  groupName: string;
  metrics: SessionReportMetrics;
  records: AttendanceRecord[];
}

export interface ScanQrResponse {
  isDuplicate: boolean;
  student: {
    id: string;
    fullName: string;
    studentCode: string;
  };
  attendance: any;
  sessionStats: {
    totalPresent: number;
    totalEnrolled: number;
  };
}

export interface AttendanceItemDto {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BatchAttendanceDto {
  records: AttendanceItemDto[];
}
