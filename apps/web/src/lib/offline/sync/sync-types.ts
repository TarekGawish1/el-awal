import { OutboxMutationRecord } from '../db';

export interface OutgoingStudentSummary {
  id: string;
  fullName: string;
  phone?: string;
  gradeLevel?: string;
  groupName?: string;
}

export interface OutgoingGroupSummary {
  id: string;
  name: string;
  gradeLevel?: string;
  monthlyFee?: number;
}

export interface OutboxSummary {
  students: OutgoingStudentSummary[];
  groups: OutgoingGroupSummary[];
  attendanceCount: number;
  paymentsCount: number;
  totalCount: number;
}

export interface IncomingDiffSummary {
  groups: { count: number; items: any[] };
  students: { count: number; items: any[] };
  attendance: { count: number; items: any[] };
  payments: { count: number; items: any[] };
  serverTime: string;
}

export type PendingActivityKind =
  | 'BOOKLET_PAYMENT'
  | 'TUITION_PAYMENT'
  | 'ATTENDANCE_SCAN'
  | 'ENTITY_UPDATE'
  | 'DELETED_RECORD'
  | 'OTHER';

export interface PendingActivityItem {
  id: string;
  domain: OutboxMutationRecord['domain'];
  kind: PendingActivityKind;
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: number;
  raw: OutboxMutationRecord;
}

export type SyncEngineEventType =
  | 'ONLINE'
  | 'OFFLINE'
  | 'SYNC_START'
  | 'SYNC_PROGRESS'
  | 'SYNC_SUCCESS'
  | 'SYNC_ERROR'
  | 'MUTATION_ENQUEUED'
  | 'MUTATION_UNDONE'
  | 'SYNC_REVIEW_REQUIRED';

export type SyncEngineEventListener = (event: {
  type: SyncEngineEventType;
  pendingCount: number;
  data?: any;
}) => void;

export function generateClientOperationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
