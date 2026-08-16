import { SubscriptionsService, RecordPaymentDto } from '../services/subscriptions.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    recordPayment(dto: Omit<RecordPaymentDto, 'recordedById'>, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string | null;
        studentId: string;
        notes: string | null;
        recordedById: string;
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
        groupId: string | null;
        studentId: string;
        notes: string | null;
        recordedById: string;
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
