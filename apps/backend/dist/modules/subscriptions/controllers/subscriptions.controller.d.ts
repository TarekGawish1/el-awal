import { SubscriptionsService } from '../services/subscriptions.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    recordPayment(dto: RecordPaymentDto, user: AuthenticatedUser): Promise<{
        student: {
            user: {
                phone: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            gradeLevel: string;
            academicStage: string | null;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
        };
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string | null;
        studentId: string;
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
    getPaymentLog(query: PaymentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        student: {
            user: {
                id: string;
                phone: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            gradeLevel: string;
            academicStage: string | null;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
        };
        group: {
            id: string;
            name: string;
        };
        recordedBy: {
            id: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string | null;
        studentId: string;
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
    }>>;
    getStudentPaymentHistory(studentId: string): Promise<{
        amountExpected: number;
        amountPaid: number;
        group: {
            id: string;
            name: string;
        };
        recordedBy: {
            fullName: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string | null;
        studentId: string;
        recordedById: string;
        notes: string | null;
        periodYear: number;
        periodMonth: number;
        currency: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        paymentMethod: string;
        receiptNumber: string | null;
    }[]>;
    getGroupDefaulters(groupId: string, periodYear: number, periodMonth: number): Promise<{
        groupId: string;
        groupName: string;
        periodYear: number;
        periodMonth: number;
        totalEnrolled: number;
        totalDefaulters: number;
        defaulters: {
            studentId: string;
            studentCode: string;
            fullName: string;
            phone: string;
            gradeLevel: string;
            monthlyFeeExpected: number;
            parentName: string;
            parentPhone: string;
        }[];
    }>;
}
