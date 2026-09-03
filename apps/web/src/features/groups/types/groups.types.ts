export interface Group {
  id: string;
  name: string;
  gradeLevel: string;
  academicYear?: string;
  academicTerm?: string;
  description?: string;
  maxCapacity?: number;
  monthlyFee?: number;
  teacherProfileId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  schedules?: GroupSchedule[];
  _count?: {
    enrollments: number;
    schedules: number;
  };
}

export interface GroupSchedule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface CreateGroupPayload {
  name: string;
  gradeLevel: string;
  academicYear?: string;
  academicTerm?: string;
  description?: string;
  maxCapacity?: number;
  monthlyFee?: number;
  schedules?: GroupSchedule[];
}

export interface EnrollStudentPayload {
  studentId: string;
  /** When true, moves the student out of any other active group into this one. */
  transfer?: boolean;
}

export interface Student {
  id: string;
  code: string;
  user: {
    name: string;
    phone: string;
  };
  gradeLevel: string;
  academicStage: string;
  academicStatus: string;
  /** Active group memberships — used to enforce one active group per student. */
  groupEnrollments?: Array<{ status?: string; group: { id: string; name: string } }>;
}

export interface GroupEnrollment {
  id: string;
  enrolledAt: string;
  status: string;
  student: Student;
  attendanceRate: number;
}

export interface GroupWithDetails extends Group {
  schedules?: any[];
}

export interface GroupRegistrationLink {
  groupId: string;
  groupName: string;
  token: string;
  registrationUrl: string;
}
