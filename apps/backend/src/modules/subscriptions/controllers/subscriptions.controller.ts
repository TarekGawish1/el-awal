import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { ScanPaymentQrDto } from '../dto/scan-payment-qr.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Subscriptions & Tuition Payments')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('record')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Record or update physical student tuition payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded and notification event emitted' })
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.recordStudentPayment(user, dto);
  }

  @Post('scan-qr')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Process QR Code scan for student tuition payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded via QR scan and notification dispatched' })
  async scanPaymentQr(
    @Body() dto: ScanPaymentQrDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.scanPaymentQr(user, dto);
  }

  @Get('payments')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'List payment audit log with Keyset cursor pagination and period filters' })
  async getPaymentLog(
    @Query() query: PaymentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.getPaymentLog(query, user);
  }

  @Get('student/:studentId')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get billing and payment history for a student' })
  async getStudentPaymentHistory(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.getStudentPaymentHistory(studentId, user);
  }

  @Get('group/:groupId/defaulters')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'List enrolled students with unpaid tuition fees for a specific billing month' })
  async getGroupDefaulters(
    @Param('groupId') groupId: string,
    @Query('periodYear', ParseIntPipe) periodYear: number,
    @Query('periodMonth', ParseIntPipe) periodMonth: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.getGroupDefaulters(
      groupId,
      periodYear,
      periodMonth,
      user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete or reverse a recorded payment' })
  async deleteStudentPayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.deleteStudentPayment(id, user);
  }
}
