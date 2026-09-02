export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'LOGIN'
  | 'SCAN_ATTENDANCE'
  | 'RECORD_PAYMENT'
  | 'GRADE_SUBMISSION'
  | 'STATUS_CHANGE';

export interface AuditLogItem {
  id: string;
  userId: string;
  userRole: 'TEACHER' | 'SECRETARIAT' | 'STUDENT' | 'PARENT';
  userName: string;
  teacherId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
    role: string;
  };
}

export interface AuditStats {
  todayCount: number;
  weekCount: number;
  totalCount: number;
  assistantCount: number;
  actionDistribution: Array<{ action: AuditAction; count: number }>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    userRole: string;
    actionCount: number;
  }>;
}

export interface PerformerItem {
  userId: string;
  userName: string;
  userRole: string;
}

export interface AuditQueryParams {
  search?: string;
  action?: AuditAction | '';
  entityType?: string;
  userId?: string;
  userRole?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
