import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../core/security/decorators/current-user.decorator';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { MatrixLedgerQueryDto } from './dto/matrix-ledger-query.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments & Financial Matrix')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('matrix-ledger')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get the complete student tuition and booklet payment matrix ledger' })
  async getMatrixLedger(
    @Query() query: MatrixLedgerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.getMatrixLedger(user, query);
  }
}
