import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService, RecordPaymentDto } from '../services/subscriptions.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Subscriptions & Payments')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('record')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Record or update physical student fee payment' })
  async recordPayment(
    @Body() dto: Omit<RecordPaymentDto, 'recordedById'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subscriptionsService.recordStudentPayment({
      ...dto,
      recordedById: user.id,
    });
  }

  @Get('student/:studentId')
  @Roles(UserRole.SECRETARIAT, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get billing and payment history for a student' })
  async getStudentPaymentHistory(@Param('studentId') studentId: string) {
    return this.subscriptionsService.getStudentPaymentHistory(studentId);
  }
}
