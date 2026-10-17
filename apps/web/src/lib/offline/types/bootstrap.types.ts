export type BootstrapEventType = 'START' | 'PROGRESS' | 'SUCCESS' | 'ERROR' | 'OFFLINE_FALLBACK';

export interface BootstrapEvent {
  type: BootstrapEventType;
  percentage: number;
  message: string;
  data?: any;
}

export type BootstrapListener = (event: BootstrapEvent) => void;

export interface BootstrapCounts {
  students: number;
  groups: number;
  sessions: number;
  payments: number;
  booklets: number;
  assessments: number;
}

export interface BootstrapResult {
  success: boolean;
  isDelta: boolean;
  counts?: BootstrapCounts;
}
