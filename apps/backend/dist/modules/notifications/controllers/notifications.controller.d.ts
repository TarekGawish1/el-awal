import { NotificationsService } from '../services/notifications.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(user: AuthenticatedUser, query: CursorPaginationDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        title: string;
        recipientId: string;
        referenceEntityId: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>>;
    getUnreadCount(user: AuthenticatedUser): Promise<{
        unreadCount: number;
    }>;
    markAsRead(id: string, user: AuthenticatedUser): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(user: AuthenticatedUser): Promise<{
        markedCount: number;
    }>;
}
