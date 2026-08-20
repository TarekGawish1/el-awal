export interface LessonSessionItem {
  id: string;
  groupId: string;
  scheduleId?: string | null;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  topic?: string | null;
  isCancelled?: boolean;
  cancellationReason?: string | null;
  createdAt: string;
  group?: {
    id: string;
    name: string;
    gradeLevel: string;
    academicYear?: string;
    academicTerm?: string;
  } | null;
  educationalContents?: Array<{
    id: string;
    title: string;
    description?: string | null;
    contentType: string;
    fileUrl: string;
    fileKey: string;
    fileSize?: number | null;
    mimeType?: string | null;
    createdAt: string;
  }>;
  _count?: {
    attendanceRecords: number;
    educationalContents: number;
  };
}

export interface CreateSessionPayload {
  groupId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  topic: string;
  scheduleId?: string;
  isCancelled?: boolean;
  cancellationReason?: string;
}

export interface UpdateSessionPayload {
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  groupId?: string;
  isCancelled?: boolean;
  cancellationReason?: string | null;
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
