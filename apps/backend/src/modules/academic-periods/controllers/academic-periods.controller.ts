import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicPeriodsService } from '../services/academic-periods.service';
import { SwitchAcademicPeriodDto } from '../dto/switch-academic-period.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Academic Periods')
@ApiBearerAuth()
@Controller('academic-periods')
export class AcademicPeriodsController {
  constructor(private readonly academicPeriodsService: AcademicPeriodsService) {}

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Password-gated switch of the active academic year and term',
  })
  @ApiResponse({ status: 200, description: 'Updated active academic period' })
  @ApiResponse({ status: 401, description: 'Invalid account password' })
  async switchPeriod(
    @Body() dto: SwitchAcademicPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academicPeriodsService.switchPeriod(user, dto);
  }
}
