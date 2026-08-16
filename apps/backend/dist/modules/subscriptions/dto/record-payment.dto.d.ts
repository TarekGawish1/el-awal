import { PaymentStatus } from '@prisma/client';
export declare class RecordPaymentDto {
    studentId: string;
    groupId?: string;
    periodYear: number;
    periodMonth: number;
    amountPaid: number;
    amountExpected?: number;
    paymentStatus?: PaymentStatus;
    paymentMethod?: string;
    receiptNumber?: string;
    notes?: string;
}
