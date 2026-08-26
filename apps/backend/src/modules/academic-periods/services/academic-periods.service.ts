import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { TeachersService } from '../../teachers/services/teachers.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SwitchAcademicPeriodDto } from '../dto/switch-academic-period.dto';

@Injectable()
export class AcademicPeriodsService {
  private readonly logger = new Logger(AcademicPeriodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
  ) {}

  /**
   * Re-verifies the caller's account password, then switches the active
   * academic year/term. Delegates the persistence to TeachersService so the
   * global-update semantics stay in one place.
   *
   * @throws UnauthorizedException when the supplied password is incorrect.
   */
  async switchPeriod(user: AuthenticatedUser, dto: SwitchAcademicPeriodDto) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    const isPasswordValid =
      !!account?.passwordHash && (await bcrypt.compare(dto.password, account.passwordHash));

    if (!isPasswordValid) {
      this.logger.warn(`Academic period switch rejected: invalid password for user [${user.id}]`);
      throw new UnauthorizedException({
        code: 'INVALID_PASSWORD',
        message: 'كلمة المرور غير صحيحة',
      });
    }

    const teacherId = user.teacherProfileId || user.id;
    const updated = await this.teachersService.updateAcademicPeriod(teacherId, {
      activeAcademicYear: dto.academicYear,
      activeAcademicTerm: dto.academicTerm,
    });

    this.logger.log(
      `Academic period switched to [${dto.academicYear} - ${dto.academicTerm}] by user [${user.id}]`,
    );

    return updated;
  }
}
