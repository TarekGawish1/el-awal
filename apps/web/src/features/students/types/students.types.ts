export type AcademicStatus = 'ACTIVE' | 'GRADUATED' | 'DROPPED_OUT' | 'SUSPENDED';

export interface StudentListItem {
  id: string;
  studentCode: string;
  gradeLevel: string;
  academicStage?: string;
  academicStatus: AcademicStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
    isActive: boolean;
  };
  groupEnrollments: Array<{
    group: {
      id: string;
      name: string;
    };
  }>;
  parentLinks?: Array<{
    parent: {
      user: {
        id: string;
        fullName: string;
        phone?: string;
        isActive: boolean;
      };
    };
  }>;
}

export interface StudentDetail extends StudentListItem {
  dateOfBirth?: string;
  emergencyPhone?: string;
  parentLinks: Array<{
    parent: {
      user: {
        id: string;
        fullName: string;
        phone?: string;
        isActive: boolean;
      };
    };
  }>;
  groupEnrollments: {
    status: 'ACTIVE' | 'PENDING' | 'TRANSFERRED' | 'DROPPED';
    group: { id: string; name: string; gradeLevel: string };
  }[];
}

export interface CreateStudentPayload {
  fullName: string;
  phone?: string;
  email?: string;
  password?: string;
  gradeLevel: string;
  academicStage?: string;
  dateOfBirth?: string;
  emergencyPhone?: string;
  parentName?: string;
  parentPhone?: string;
  parentRelationship?: string;
  initialGroupId?: string;
}

export interface StudentQrResponse {
  studentId: string;
  studentCode: string;
  fullName: string;
  gradeLevel: string;
  qrCodeToken: string;
}

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

export interface StudentQuery {
  search?: string;
  gradeLevel?: string;
  academicStage?: string;
  groupId?: string;
  academicStatus?: AcademicStatus;
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}
