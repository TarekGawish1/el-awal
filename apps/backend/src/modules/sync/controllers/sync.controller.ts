import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from '../services/sync.service';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
import { SyncAttendanceBatchDto } from '../dto/sync-attendance.dto';
import { SyncPaymentsBatchDto } from '../dto/sync-payments.dto';
import { SyncAssessmentsBatchDto } from '../dto/sync-assessments.dto';
import { UnifiedSyncBatchDto } from '../dto/sync-batch.dto';
import { BootstrapQueryDto } from '../dto/sync-bootstrap.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Offline Sync Engine')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('bootstrap')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({
    summary: 'Zero Cold-Start bulk snapshot endpoint for client bootstrap and offline hydration',
  })
  @ApiResponse({ status: 200, description: 'Role-scoped bulk dataset for offline pre-caching' })
  async getBootstrap(
    @Query() query: BootstrapQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.getBootstrapSnapshot(user, query.since);
  }

  @Get('diff')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({
    summary: 'Bi-directional sync diff summary endpoint returning remote delta changes since a given timestamp',
  })
  @ApiResponse({ status: 200, description: 'Lightweight summary of changes on the remote server' })
  async getSyncDiff(
    @Query('since') since: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.getSyncDiff(user, since);
  }

  @Post('attendance')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Atomically reconcile batch offline attendance roll-call records with duplicate suppression',
  })
  @ApiResponse({ status: 200, description: 'Attendance batch successfully reconciled' })
  async syncAttendance(
    @Body() dto: SyncAttendanceBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.syncAttendanceBatch(user, dto);
  }

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Atomically reconcile batch offline student tuition fee payments with idempotency enforcement',
  })
  @ApiResponse({ status: 200, description: 'Payments batch successfully processed' })
  async syncPayments(
    @Body() dto: SyncPaymentsBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.syncPaymentsBatch(user, dto);
  }

  @Post('progress')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Atomically flush offline progress outbox batch with monotonic reconciliation',
  })
  @ApiResponse({ status: 200, description: 'Course progress batch reconciled' })
  async syncProgress(
    @Body() dto: BatchProgressSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.processBatchProgress(user.studentProfileId || user.id, dto);
  }

  @Post('assessments')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Atomically ingest offline student assessment and exam submissions',
  })
  @ApiResponse({ status: 200, description: 'Assessment submissions ingested and auto-graded' })
  async syncAssessments(
    @Body() dto: SyncAssessmentsBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.syncAssessmentsBatch(user.studentProfileId || user.id, dto);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Unified multi-domain batch synchronization endpoint for offline outbox flush',
  })
  @ApiResponse({ status: 200, description: 'Unified batch sync results' })
  async syncBatch(
    @Body() dto: UnifiedSyncBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.syncUnifiedBatch(user, dto);
  }
}
