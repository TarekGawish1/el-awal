export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  ESSAY = 'ESSAY',
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
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  dueDate: string | null;
  durationMinutes: number | null;
  _count?: {
    submissions: number;
    questions: number;
  };
}

export interface AssessmentDetail {
  id: string;
  title: string;
  type: 'EXAM' | 'ASSIGNMENT';
  description: string | null;
  groupId: string | null;
  courseId: string | null;
  teacherId: string;
  totalScore: number;
  passingScore: number;
  isPublished: boolean;
  isAutoGraded: boolean;
  dueDate: string | null;
  durationMinutes: number | null;
  questions: AssessmentQuestion[];
  mySubmission?: any;
  _count?: {
    submissions: number;
    questions: number;
  };
}

export interface CreateAssessmentPayload {
  groupId?: string;
  courseId?: string;
  title: string;
  type: string;
  description?: string;
  totalScore: number;
  passingScore: number;
  dueDate?: string;
  durationMinutes?: number;
  isPublished: boolean;
  isAutoGraded: boolean;
  questions: Omit<AssessmentQuestion, 'id'>[];
}

export interface UpdateAssessmentPayload {
  title?: string;
  description?: string;
  totalScore?: number;
  passingScore?: number;
  durationMinutes?: number;
  dueDate?: string;
  isPublished?: boolean;
}

export interface AssessmentSubmissionListItem {
  id: string;
  studentId: string;
  student: {
    user: {
      fullName: string;
    };
  };
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
  status: SubmissionStatus;
  scoreObtained: number | null;
  isPassed: boolean;
  isAutoGraded: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
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
