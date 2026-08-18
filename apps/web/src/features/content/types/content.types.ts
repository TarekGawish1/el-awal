export enum ContentType {
  FILE = 'FILE',
  SUMMARY = 'SUMMARY',
  REFERENCE = 'REFERENCE',
  LECTURE_RECORDING = 'LECTURE_RECORDING',
}

export interface EducationalContent {
  id: string;
  teacherId: string;
  groupId?: string | null;
  lessonId?: string | null;
  sessionId?: string | null;
  gradeLevel?: string | null;
  academicYear?: string | null;
  academicTerm?: string | null;
  sessionTopic?: string | null;
  title: string;
  description?: string | null;
  contentType: ContentType;
  fileKey: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
  
  group?: { id: string; name: string; gradeLevel?: string; academicYear?: string; academicTerm?: string } | null;
  session?: { id: string; topic?: string | null; sessionDate?: string; startTime?: string | null } | null;
  lesson?: { id: string; title: string } | null;
  _count?: { progresses: number };
}

export interface PresignedUploadPayload {
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
  folder?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export interface CreateContentPayload {
  title: string;
  description?: string;
  contentType: ContentType;
  fileKey: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  groupId?: string;
  gradeLevel?: string;
  academicYear?: string;
  academicTerm?: string;
  sessionTopic?: string;
  sessionId?: string;
  lessonId?: string;
}
