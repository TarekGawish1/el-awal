import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { AuditQueryDto } from '../dto/audit-query.dto';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit & Activity Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles(UserRole.TEACHER)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated and filtered audit logs for the teacher' })
  async getLogs(
    @Query() query: AuditQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.getLogs(user.id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit activity summary statistics' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.auditService.getStats(user.id);
  }

  @Get('performers')
  @ApiOperation({ summary: 'Get list of users who performed actions in this workspace' })
  async getPerformers(@CurrentUser() user: AuthenticatedUser) {
    return this.auditService.getPerformers(user.id);
  }
}
