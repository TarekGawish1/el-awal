export type MutationStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';

export interface OutboxMutationRecord {
  id: string;
  userId?: string;
  domain: 'attendance' | 'finance' | 'progress' | 'assessments' | 'students' | 'groups' | 'generic';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  clientTimestamp: number;
  retryCount: number;
  status: MutationStatus;
  conflictStrategy?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MONOTONIC' | 'MANUAL_REVIEW';
  lastError?: string;
  lastAttemptAt?: number;
  optimisticId?: string;
  type?: string;
  /** Local-only snapshot used to restore IndexedDB when a pending edit is undone. */
  rollbackData?: unknown;
}

export interface OfflineRosterRecord {
  groupId: string;
  groupName: string;
  gradeLevel?: string;
  monthlyFee?: number;
  students: Array<{
    id: string;
    fullName: string;
    studentCode?: string;
    qrCodeToken: string;
    gradeLevel?: string;
    emergencyPhone?: string;
    parentPhone?: string;
    academicStatus?: string;
  }>;
  sessions?: any[];
  updatedAt: number;
}

export interface OfflineAssessmentRecord {
  assessmentId: string;
  title: string;
  durationMinutes?: number;
  dueDate?: string;
  totalScore: number;
  questions: any[];
  draftAnswers: Record<string, string>;
  isSubmitted: boolean;
  submittedAt?: number;
  localScore?: number;
  updatedAt: number;
}

export interface OfflineCredentialsRecord {
  identifier: string; // Canonical identifier (lowercased email/phone)
  salt: string;
  hash: string;
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;
    expiresIn?: number;
  };
  cachedAt: number;
}

export interface SyncConflictRecord {
  id: string;
  operationId: string;
  domain: string;
  reason: string;
  payload: any;
  timestamp: number;
  resolved: boolean;
  resolutionNote?: string;
}
