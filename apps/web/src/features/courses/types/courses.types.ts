export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonType = 'VIDEO' | 'DOCUMENT' | 'LIVE';
export type AssessmentType = 'EXAM' | 'HOMEWORK' | 'QUIZ';

export interface AssessmentQuizSubmissionSummary {
  status: 'SUBMITTED' | 'GRADED' | 'UNSOLVED' | 'PENDING';
  scoreObtained: number | null;
  attemptNumber: number;
  isPassed?: boolean;
}

export interface AssessmentSummary {
  id: string;
  title: string;
  type: AssessmentType;
  totalScore: number;
  durationMinutes?: number | null;
  passingScore?: number | null;
  allowMultipleAttempts?: boolean;
  attemptCount?: number;
  mySubmission?: AssessmentQuizSubmissionSummary | null;
}

export interface LessonAttachment {
  id: string;
  title: string;
  fileUrl: string;
  fileKey: string;
  fileSize?: number | null;
  fileType?: string | null;
  lessonId: string;
  createdAt: string;
}

export interface LessonQuestionReply {
  id: string;
  content: string;
  questionId: string;
  authorId: string;
  authorRole: string;
  authorName: string;
  createdAt: string;
}

export interface LessonQuestion {
  id: string;
  content: string;
  videoTimestamp?: number | null;
  lessonId: string;
  studentId: string;
  studentUserId?: string;
  studentName: string;
  createdAt: string;
  updatedAt: string;
  replies: LessonQuestionReply[];
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  orderIndex: number;
  lessonType: LessonType | string;
  bunnyVideoId?: string | null;
  contentUrl?: string | null;
  videoDurationSeconds?: number | null;
  isPreview: boolean;
  lessonQuizId?: string | null;
  lessonQuiz?: AssessmentSummary | null;
  attachments?: LessonAttachment[];
  _count?: {
    attachments?: number;
    questions?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  unitQuizId?: string | null;
  unitQuiz?: AssessmentSummary | null;
  lessons: CourseLesson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupAccessItem {
  id: string;
  courseId: string;
  groupId: string;
  group?: {
    id: string;
    name: string;
    gradeLevel?: string;
  };
}

export interface CourseDetail {
  id: string;
  teacherId: string;
  title: string;
  description?: string | null;
  subject: string;
  gradeLevel: string;
  academicStage?: string | null;
  academicYear?: string | null;
  academicTerm?: string | null;
  price: number | string;
  coverImageUrl?: string | null;
  status: CourseStatus;
  orderIndex: number;
  enforceSequentialLessons?: boolean;
  requireExamPassingToUnlock?: boolean;
  hasCertificate?: boolean;
  courseQuizId?: string | null;
  courseQuiz?: AssessmentSummary | null;
  modules: CourseModule[];
  groupAccess?: GroupAccessItem[];
  teacher?: {
    user?: {
      fullName?: string;
      email?: string;
      phone?: string;
    };
  };
  _count?: {
    enrollments?: number;
    modules?: number;
  };
  totalLessons?: number;
  totalDurationSeconds?: number;
  completedLessonIds?: string[];
  allLessonsCompleted?: boolean;
  allQuizzesCompleted?: boolean;
  totalQuizzesCount?: number;
  completedQuizzesCount?: number;
  isCertificateEligible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DirectUploadCredentials {
  provider?: 'bunny' | 'r2';
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  authorizationSignature: string;
  authorizationExpire: number;
  accessKey: string;
  embedUrl: string;
  playbackUrl: string;
  contentUrl?: string;
}

export interface LessonViewerData {
  lessonId: string;
  moduleId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  lessonType: string;
  isPreview: boolean;
  videoDurationSeconds?: number | null;
  videoPlayerUrl?: string | null;
  contentUrl?: string | null;
  documentDownloadUrl?: string | null;
  attachments?: LessonAttachment[];
  lessonQuiz?: AssessmentSummary | null;
  unitQuiz?: AssessmentSummary | null;
  courseQuiz?: AssessmentSummary | null;
  lastPositionSeconds: number;
  isCompleted: boolean;
}

export interface CourseEnrollmentStudent {
  id: string;
  studentId: string;
  fullName: string;
  phone?: string | null;
  studentCode?: string | null;
  gradeLevel: string;
  accessType?: string;
  status?: string;
  enrolledAt: string;
  groups?: string[];
  progressPercentage?: number;
}

