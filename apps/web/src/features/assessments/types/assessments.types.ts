export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  ESSAY = 'ESSAY',
}

export enum ExamTimingType {
  FIXED_SESSION = 'FIXED_SESSION',
  FLEXIBLE_WINDOW = 'FLEXIBLE_WINDOW',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
}

export interface AssessmentQuestion {
  id?: string;
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  optionsData?: string[];
  optionImages?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
}

export interface AssessmentListItem {
  id: string;
  title: string;
  type: 'EXAM' | 'ASSIGNMENT';
  assessmentType?: 'HOMEWORK' | 'EXAM' | 'QUIZ' | 'ASSIGNMENT';
  timingType?: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | null;
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  requirePassingScore?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  dueDate: string | null;
  deadline?: string | null;
  durationMinutes: number | null;
  lessonId?: string | null;
  academicStage?: string | null;
  gradeLevel?: string | null;
  group?: {
    id: string;
    name: string;
    academicYear?: string;
    academicTerm?: string;
  } | null;
  targetGroups?: Array<{
    id: string;
    name: string;
    academicYear?: string;
    academicTerm?: string;
  }>;
  course?: {
    id: string;
    title: string;
    academicYear?: string;
    academicTerm?: string;
  } | null;
  _count?: {
    submissions: number;
    questions: number;
  };
}

export interface AssessmentAttemptSummary {
  id: string;
  attemptNumber: number;
  status: SubmissionStatus;
  scoreObtained: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
}

export interface AssessmentDetail {
  id: string;
  title: string;
  type: 'EXAM' | 'ASSIGNMENT';
  assessmentType?: 'HOMEWORK' | 'EXAM' | 'QUIZ' | 'ASSIGNMENT';
  timingType?: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | null;
  description: string | null;
  groupId: string | null;
  courseId: string | null;
  teacherId: string;
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  isAutoGraded: boolean;
  allowMultipleAttempts: boolean;
  isOptional?: boolean;
  requirePassingScore?: boolean;
  lessonId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  dueDate: string | null;
  deadline?: string | null;
  durationMinutes: number | null;
  serverTime?: string;
  effectiveRemainingSeconds?: number | null;
  isLate?: boolean;
  questions: AssessmentQuestion[];
  mySubmission?: any;
  attemptCount?: number;
  bestScore?: number | null;
  attempts?: AssessmentAttemptSummary[];
  _count?: {
    submissions: number;
    questions: number;
  };
}

export interface CreateAssessmentPayload {
  groupId?: string;
  targetGroupIds?: string[];
  courseId?: string | null;
  courseLinkScope?: 'COURSE' | 'UNIT';
  moduleId?: string;
  academicStage?: string | null;
  gradeLevel?: string | null;
  title: string;
  type: string;
  assessmentType?: 'HOMEWORK' | 'EXAM' | 'QUIZ' | 'ASSIGNMENT';
  timingType?: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW';
  description?: string;
  totalScore: number;
  passingScore: number;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  dueDate?: string;
  deadline?: string;
  durationMinutes?: number | null;
  isPublished: boolean;
  isAutoGraded?: boolean;
  allowMultipleAttempts?: boolean;
  isOptional?: boolean;
  requirePassingScore?: boolean;
  questions: Omit<AssessmentQuestion, 'id'>[];
}

export interface UpdateAssessmentPayload {
  title?: string;
  description?: string;
  totalScore?: number;
  passingScore?: number;
  timingType?: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW';
  durationMinutes?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  dueDate?: string;
  deadline?: string;
  isPublished?: boolean;
  allowMultipleAttempts?: boolean;
  isOptional?: boolean;
  requirePassingScore?: boolean;
  assessmentType?: 'HOMEWORK' | 'EXAM' | 'QUIZ' | 'ASSIGNMENT';
  courseId?: string | null;
  lessonId?: string | null;
}

export interface AssessmentSubmissionListItem {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  student?: {
    user: {
      fullName: string;
    };
  };
  attemptNumber?: number;
  isOfficial?: boolean;
  status: SubmissionStatus;
  scoreObtained: number | null;
  isPassed: boolean;
  isAutoGraded: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
}

export interface StudentAnswer {
  id: string;
  questionId: string;
  answerGiven: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  teacherFeedback: string | null;
}

export interface AssessmentSubmissionDetail {
  id: string;
  assessmentId: string;
  studentId: string;
  student: {
    user: {
      fullName: string;
    };
  };
  assessment: AssessmentDetail;
  attemptNumber?: number;
  status: SubmissionStatus;
  scoreObtained: number | null;
  isPassed: boolean;
  isAutoGraded: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
  teacherFeedback?: string | null;
  feedback?: string | null;
  answers: StudentAnswer[];
}

export interface GradeSubmissionPayload {
  feedback?: string;
  manualGrades: {
    questionId: string;
    pointsEarned: number;
    teacherFeedback?: string;
  }[];
}
