import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
export declare class SubscriptionsService {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    recordStudentPayment(recordedById: string, dto: RecordPaymentDto): Promise<{
        group: {
            name: string;
            id: string;
        };
        student: {
            user: {
                fullName: string;
                phone: string;
            };
        } & {
            id: string;
            gradeLevel: string;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            academicStage: string | null;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
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
        group: {
            name: string;
            id: string;
        };
        student: {
            user: {
                id: string;
                fullName: string;
                phone: string;
            };
        } & {
            id: string;
            gradeLevel: string;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            academicStage: string | null;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
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
            name: string;
            id: string;
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
