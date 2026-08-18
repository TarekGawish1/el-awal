export interface Group {
  id: string;
  name: string;
  gradeLevel: string;
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
  description?: string;
  maxCapacity?: number;
  monthlyFee?: number;
  schedules?: GroupSchedule[];
}

export interface EnrollStudentPayload {
  studentId: string;
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
