/**
 * Student Portal TypeScript Types
 * Aligned with backend DTOs from the API Contract Audit
 */

// ─── Course Types ───────────────────────────────────────────────────────────

export interface CourseCatalogItem {
  id: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  academicStage?: string;
  coverImageUrl?: string;
  price: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  teacherId: string;
  teacher: {
    user: { fullName: string };
  };
  _count: {
    modules: number;
    enrollments: number;
  };
  createdAt: string;
}

export interface EnrolledCourse {
  courseId: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  coverImageUrl?: string;
  teacherName: string;
  enrolledAt: string;
  accessStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  totalModules: number;
  totalLessons: number;
  progressPercentage: number;
}

export interface CourseDetail {
  id: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  academicStage?: string;
  coverImageUrl?: string;
  price: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  teacher: {
    id: string;
    user: { fullName: string; email?: string };
  };
  modules: CourseModule[];
  _count: { enrollments: number };
  createdAt: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessonType: 'VIDEO' | 'DOCUMENT';
  videoDurationSeconds?: number;
  isPreview: boolean;
  createdAt: string;
}

export interface LessonViewerData {
  lessonId: string;
  moduleId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string;
  lessonType: 'VIDEO' | 'DOCUMENT';
  isPreview: boolean;
  videoDurationSeconds?: number;
  videoPlayerUrl?: string | null;
  documentDownloadUrl?: string | null;
  lastPositionSeconds: number;
  isCompleted: boolean;
}

export interface LessonProgressUpdate {
  lastPositionSeconds: number;
  isCompleted?: boolean;
}

export interface LessonProgressResponse {
  lessonId: string;
  courseId: string;
  lastPositionSeconds: number;
  isCompleted: boolean;
  overallCourseCompletionPercentage: number;
  lastSyncedAt: string;
}

export interface EnrollmentResult {
  enrollmentId: string;
  courseId: string;
  studentId: string;
  status: string;
  accessStatus: string;
  enrolledAt: string;
}

// ─── Assessment Types ──────────────────────────────────────────────────────

export interface StudentAssessment {
  id: string;
  title: string;
  description?: string;
  type: 'EXAM' | 'HOMEWORK';
  totalScore: number;
  passingScore?: number;
  durationMinutes?: number;
  dueDate?: string;
  isPublished: boolean;
  isAutoGraded: boolean;
  teacher: {
    user: { fullName: string };
  };
  group?: { id: string; name: string };
  course?: { id: string; title: string };
  _count: { questions: number; submissions: number };
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';
  optionsData?: string; // JSON stringified options array
  imageUrl?: string;
  points: number;
  // Redacted for students until graded:
  correctAnswer?: string;
  explanation?: string;
}

export interface AssessmentDetail {
  id: string;
  title: string;
  description?: string;
  type: 'EXAM' | 'HOMEWORK';
  totalScore: number;
  passingScore?: number;
  durationMinutes?: number;
  dueDate?: string;
  isPublished: boolean;
  teacher: {
    user: { fullName: string };
  };
  group?: { id: string; name: string };
  course?: { id: string; title: string };
  questions: AssessmentQuestion[];
  mySubmission: StudentSubmission | null;
}

export interface StudentSubmission {
  id: string;
  status: 'SUBMITTED' | 'GRADED';
  scoreObtained?: number;
  submittedAt: string;
  gradedAt?: string;
  teacherFeedback?: string;
  answers: StudentAnswer[];
}

export interface StudentAnswer {
  id: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  maxPointsSnapshot: number;
  teacherFeedback?: string;
}

export interface SubmitAnswerPayload {
  questionId: string;
  answerGiven: string;
}

export interface SubmitAssessmentPayload {
  answers: SubmitAnswerPayload[];
  attachmentUrl?: string;
}

export interface SubmitAssessmentResult {
  submissionId: string;
  assessmentId: string;
  status: 'SUBMITTED' | 'GRADED';
  scoreObtained?: number;
  totalScore: number;
  isAutoGraded: boolean;
  submittedAt: string;
  gradedAt?: string;
}

// ─── Attendance Types ──────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  source: 'QR_SCAN' | 'MANUAL';
  createdAt: string;
  session?: {
    id: string;
    date: string;
    group?: {
      id: string;
      name: string;
    };
  };
}

// ─── Payment Types ─────────────────────────────────────────────────────────

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'WAIVED';

export interface StudentPayment {
  id: string;
  studentId: string;
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  amountExpected: number;
  amountPaid: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  group?: { id: string; name: string };
  recordedBy?: { fullName: string };
}

// ─── Notification Types ────────────────────────────────────────────────────

export interface StudentNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ─── Offline Sync Types ────────────────────────────────────────────────────

export interface SyncProgressOperation {
  clientOperationId: string;
  lessonId: string;
  courseId: string;
  positionSeconds: number;
  isCompleted: boolean;
  occurredAt: string;
}

export interface SyncBatchPayload {
  operations: SyncProgressOperation[];
}

export interface SyncBatchResult {
  syncedCount: number;
  processedOperationIds: string[];
  courseId: string;
  overallCourseCompletionPercentage: number;
}

// ─── Cursor Pagination ─────────────────────────────────────────────────────

export interface CursorPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    limit: number;
    total?: number;
  };
  timestamp: string;
}
