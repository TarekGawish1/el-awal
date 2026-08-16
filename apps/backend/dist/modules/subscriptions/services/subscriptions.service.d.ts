import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentStatus } from '@prisma/client';
export interface RecordPaymentDto {
    studentId: string;
    groupId?: string;
    periodYear: number;
    periodMonth: number;
    amountExpected: number;
    amountPaid: number;
    currency?: string;
    paymentStatus?: PaymentStatus;
    paymentMethod?: string;
    receiptNumber?: string;
    notes?: string;
    recordedById: string;
}
export declare class SubscriptionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordStudentPayment(dto: RecordPaymentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        groupId: string | null;
        recordedById: string;
        notes: string | null;
        periodYear: number;
        periodMonth: number;
        amountExpected: import("@prisma/client/runtime/library").Decimal;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        paymentMethod: string;
        receiptNumber: string | null;
    }>;
    getStudentPaymentHistory(studentId: string): Promise<({
        group: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        groupId: string | null;
        recordedById: string;
        notes: string | null;
        periodYear: number;
        periodMonth: number;
        amountExpected: import("@prisma/client/runtime/library").Decimal;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        paymentMethod: string;
        receiptNumber: string | null;
    })[]>;
}
