export interface LessonSessionItem {
  id: string;
  groupId: string;
  scheduleId?: string | null;
  sessionDate: string;
  startTime?: string | null;
  topic?: string | null;
  createdAt: string;
  group?: {
    id: string;
    name: string;
    gradeLevel: string;
    academicYear?: string;
    academicTerm?: string;
  } | null;
  _count?: {
    attendanceRecords: number;
    educationalContents: number;
  };
}

export interface CreateSessionPayload {
  groupId: string;
  sessionDate: string;
  startTime?: string;
  topic: string;
  scheduleId?: string;
}

export interface UpdateSessionPayload {
  sessionDate?: string;
  startTime?: string;
  topic?: string;
  groupId?: string;
}

export interface GenerateSessionsPayload {
  startDate: string;
  endDate: string;
  topicPrefix?: string;
}

export interface TeacherCalendarQuery {
  groupId?: string;
  gradeLevel?: string;
  academicYear?: string;
  academicTerm?: string;
  startDate?: string;
  endDate?: string;
  timeframe?: 'PAST' | 'TODAY' | 'UPCOMING' | 'ALL';
  search?: string;
}
