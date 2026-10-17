export interface StudentEntity {
  id: string;
  userId?: string;
  fullName: string;
  phone?: string;
  email?: string;
  studentCode: string;
  qrCodeToken: string;
  gradeLevel?: string;
  academicStage?: string;
  emergencyPhone?: string;
  parentPhone?: string;
  academicStatus?: string;
  groupId?: string;
  groupIds?: string[];
  isActive?: boolean;
  isArchived?: boolean;
  updatedAt?: number;
  user?: {
    id?: string;
    fullName: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  };
  groupEnrollments?: any[];
  parentLinks?: any[];
  attendanceRecords?: any[];
  paymentRecords?: any[];
}

export interface GroupEntity {
  id: string;
  name: string;
  gradeLevel?: string;
  academicYear?: string;
  academicTerm?: string;
  monthlyFee?: number;
  maxCapacity?: number;
  maxStudents?: number;
  status?: string;
  description?: string;
  schedules?: any[];
  _count?: { enrollments?: number; schedules?: number };
  updatedAt?: number;
}

export interface SessionEntity {
  id: string;
  groupId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
  topic?: string;
  status?: string;
  isCancelled?: boolean;
  group?: {
    id?: string;
    name: string;
    gradeLevel?: string;
    academicYear?: string;
    academicTerm?: string;
  };
  _count?: { attendanceRecords?: number };
}

export interface ScheduleEntity {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
  location?: string;
}

export interface BookletEntity {
  id: string;
  title: string;
  price: number;
  gradeLevel: string;
  groupId?: string | null;
  teacherProfileId?: string;
  academicYear?: string;
  academicTerm?: string;
  stockCount?: number | null;
  isActive: boolean;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  salesCount?: number;
  totalRevenue?: number;
  group?: { id: string; name: string; gradeLevel?: string } | null;
}

export interface PaymentEntity {
  id: string;
  studentId: string;
  groupId?: string | null;
  periodYear: number;
  periodMonth: number;
  amountPaid: number;
  amountExpected?: number;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER' | string;
  bookletId?: string | null;
  booklet?: { id: string; title: string; price?: number } | null;
  paymentStatus: string;
  paymentMethod: string;
  currency?: string;
  receiptNumber?: string | null;
  notes?: string | null;
  recordedById?: string | null;
  createdAt: string | number;
  updatedAt?: string | number;
  student?: { user?: { fullName?: string } };
  group?: { name?: string };
}

export interface AssessmentEntity {
  id: string;
  title: string;
  type?: 'EXAM' | 'ASSIGNMENT' | string;
  description?: string;
  assessmentType?: string;
  totalScore: number;
  passingScore?: number;
  durationMinutes?: number;
  dueDate?: string;
  isPublished: boolean;
  mySubmission?: any;
  questions: Array<{
    id: string;
    questionNumber: number;
    questionText: string;
    questionType: string;
    optionsData?: any;
    imageUrl?: string;
    points: number;
    correctAnswer?: string;
  }>;
  submissions?: any[];
}

export interface CourseEntity {
  id: string;
  title: string;
  description?: string;
  gradeLevel?: string;
  isPublished: boolean;
  lessons?: any[];
}

export interface HomeworkRecordEntity {
  id: string;
  assessmentId: string;
  studentId: string;
  sessionId: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED_ONLINE' | 'CHECKED_ONSITE' | 'EXCUSED' | 'INCOMPLETE';
  checkedByRole?: 'TEACHER' | 'SECRETARIAT' | string;
  recordedMethod?: 'QR_SCAN' | 'MANUAL' | string;
  score?: number | null;
  feedback?: string | null;
  clientTimestamp: number;
  syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
  studentName?: string;
  studentCode?: string;
}
