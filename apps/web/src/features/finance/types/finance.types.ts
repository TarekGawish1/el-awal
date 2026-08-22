export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  EXEMPT = 'EXEMPT',
  REFUNDED = 'REFUNDED',
}

export interface StudentPaymentRecord {
  id: string;
  studentId: string;
  groupId: string | null;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER' | string;
  bookletId?: string | null;
  booklet?: {
    id: string;
    title: string;
    price: number;
  } | null;
  periodYear: number;
  periodMonth: number;
  amountExpected: number;
  amountPaid: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  receiptNumber: string | null;
  recordedById: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    user: {
      fullName: string;
      phone?: string | null;
    };
  };
  group?: {
    id: string;
    name: string;
  };
  recordedBy?: {
    id: string;
    fullName: string;
  };
}

export interface Defaulter {
  studentId: string;
  studentCode: string | null;
  fullName: string;
  phone: string | null;
  gradeLevel: string;
  monthlyFeeExpected: number;
  parentName: string | null;
  parentPhone: string | null;
}

export interface DefaultersResponse {
  groupId: string;
  groupName: string;
  periodYear: number;
  periodMonth: number;
  totalEnrolled: number;
  totalDefaulters: number;
  defaulters: Defaulter[];
}

export interface RecordPaymentPayload {
  studentId: string;
  groupId?: string;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER' | string;
  bookletId?: string;
  periodYear: number;
  periodMonth: number;
  amountPaid: number;
  amountExpected?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface ScanPaymentQrPayload {
  qrCodeToken: string;
  groupId?: string;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER' | string;
  bookletId?: string;
  periodYear?: number;
  periodMonth?: number;
  amountPaid?: number;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface ScanPaymentQrResponse {
  success: boolean;
  isDuplicate: boolean;
  message: string;
  payment: StudentPaymentRecord;
  booklet?: {
    id: string;
    title: string;
    price: number;
  } | null;
  student: {
    id: string;
    fullName: string;
    phone?: string | null;
  };
  group: {
    id: string;
    name: string;
  } | null;
}

export interface PaymentQuery {
  studentId?: string;
  groupId?: string;
  periodYear?: number;
  periodMonth?: number;
  paymentStatus?: PaymentStatus;
  limit?: number;
  cursor?: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
}
