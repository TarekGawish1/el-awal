import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { ScanQrDto } from '../dto/scan-qr.dto';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { UserRole, AttendanceStatus } from '@prisma/client';

@ApiTags('Attendance & Absence')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('sessions/:sessionId/scan-qr')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Atomically record student attendance for a session via scanned QR code' })
  @ApiResponse({ status: 200, description: 'Attendance successfully recorded or confirmed duplicate' })
  @ApiResponse({ status: 400, description: 'Invalid QR token or student not enrolled in group' })
  async scanQrCode(
    @Param('sessionId') sessionId: string,
    @Body() dto: ScanQrDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.processQrScan(sessionId, dto.qrCodeToken, user);
  }

  @Post('sessions/:sessionId/manual')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Batch update manual roll-call attendance for a lesson session' })
  @ApiResponse({ status: 200, description: 'Manual roll-call recorded' })
  async recordManualBatch(
    @Param('sessionId') sessionId: string,
    @Body() dto: BatchAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.recordManualBatch(sessionId, dto, user);
  }

  @Get('sessions/:sessionId/report')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get consolidated attendance rate metrics and roster log for a session' })
  async getSessionReport(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getSessionReport(sessionId, user);
  }

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get paginated attendance history for a student' })
  async getStudentHistory(
    @Param('studentId') studentId: string,
    @Query() pagination: CursorPaginationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.getStudentHistory(studentId, pagination, status, user);
  }
}
