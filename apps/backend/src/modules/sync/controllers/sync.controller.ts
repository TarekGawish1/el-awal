import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from '../services/sync.service';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Offline Sync Engine')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('progress')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Atomically flush offline progress outbox batch with monotonic reconciliation' })
  async syncProgress(
    @Body() dto: BatchProgressSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.processBatchProgress(user.studentProfileId || user.id, dto);
  }
}
