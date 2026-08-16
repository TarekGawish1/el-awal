import { NotificationsService } from '../services/notifications.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUnreadNotifications(user: AuthenticatedUser): Promise<{
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
    markAsRead(id: string, user: AuthenticatedUser): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
