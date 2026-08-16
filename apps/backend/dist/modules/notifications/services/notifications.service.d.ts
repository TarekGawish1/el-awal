import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus } from '@prisma/client';
export interface CreateNotificationDto {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    referenceEntityId?: string;
}
export declare class NotificationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createNotification(dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        recipientId: string;
        message: string;
        referenceEntityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getNotifications(recipientId: string, query: CursorPaginationDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        id: string;
        createdAt: Date;
        title: string;
        type: string;
        recipientId: string;
        message: string;
        referenceEntityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>>;
    getUnreadCount(recipientId: string): Promise<{
        unreadCount: number;
    }>;
    markAsRead(notificationId: string, recipientId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(recipientId: string): Promise<{
        markedCount: number;
    }>;
    handleAbsenceEvent(payload: {
        studentId: string;
        groupName?: string;
        date?: Date;
        status?: AttendanceStatus;
    }): Promise<void>;
    handleAssessmentGradedEvent(payload: {
        submissionId: string;
        assessmentId: string;
        studentId: string;
        scoreObtained: number | null;
    }): Promise<void>;
    handlePaymentRecordedEvent(payload: {
        studentId: string;
        studentName: string;
        groupId?: string;
        groupName?: string;
        amountPaid: number;
        periodYear: number;
        periodMonth: number;
    }): Promise<void>;
}
