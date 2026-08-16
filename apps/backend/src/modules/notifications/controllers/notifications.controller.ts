import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';

@ApiTags('In-App Notification Feed')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get Keyset cursor-paginated notification feed for authenticated user' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CursorPaginationDto,
  ) {
    return this.notificationsService.getNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total count of unread notifications for badge presentation' })
  @ApiResponse({ status: 200, description: 'Unread counter object' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
