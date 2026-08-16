import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService, QrScanInputDto } from '../services/attendance.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { UserRole, AttendanceStatus } from '@prisma/client';

@ApiTags('Attendance & Absence')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('qr-scan')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Atomically record student attendance via scanned QR code token' })
  async scanQrCode(
    @Body() dto: QrScanInputDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.processQrScan(dto, user.id);
  }

  @Get('student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get paginated attendance history for a student' })
  async getStudentHistory(
    @Param('studentId') studentId: string,
    @Query() pagination: CursorPaginationDto,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.getStudentHistory(studentId, pagination, status);
  }
}
