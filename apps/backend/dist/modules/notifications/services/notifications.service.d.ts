import { PrismaService } from '../../../core/database/prisma.service';
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
        title: string;
        createdAt: Date;
        type: string;
        message: string;
        recipientId: string;
        referenceEntityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getUnreadNotifications(recipientId: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        type: string;
        message: string;
        recipientId: string;
        referenceEntityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    markAsRead(notificationId: string, recipientId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    handleStudentAbsenceEvent(payload: {
        studentId: string;
        groupName: string;
        date: Date;
    }): Promise<void>;
}
