import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthService } from './auth.service';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import {
  VerifyStudentRegistrationDto,
  RegisterStudentAccountDto,
} from '../dto/student-registration.dto';
import {
  hashStudentRegistrationCode,
  registrationCodeHashesMatch,
} from '../../../common/utils/student-registration-code.util';

export interface StudentRegistrationTokenPayload {
  sub: string;
  typ: 'student_registration';
}

@Injectable()
export class StudentRegistrationService {
  private readonly logger = new Logger(StudentRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  /**
   * STEP 1 — Verifies that the student exists, is pending self-registration,
   * and holds the correct one-time activation code.
   *
   * Anti-enumeration: unknown student, missing/expired code and code mismatch
   * all return the same generic error. The "already registered" outcome is only
   * revealed after a successful code match (the caller provably holds the code).
   */
  async verifyStudent(dto: VerifyStudentRegistrationDto) {
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        studentCode: dto.studentCode.trim().toUpperCase(),
        user: { deletedAt: null },
      },
      select: {
        id: true,
        studentCode: true,
        gradeLevel: true,
        registrationCodeHash: true,
        accountClaimedAt: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    const genericFailure = new UnauthorizedException({
      code: 'STUDENT_VERIFICATION_FAILED',
      message: 'بيانات التحقق غير صحيحة، يرجى مراجعة كود الطالب وكود التفعيل',
    });

    if (!student || !student.registrationCodeHash) {
      this.logger.warn(`Student registration verification failed: student not found or no pending code`);
      throw genericFailure;
    }

    const submittedHash = hashStudentRegistrationCode(dto.registrationCode);
    if (!registrationCodeHashesMatch(submittedHash, student.registrationCodeHash)) {
      this.logger.warn(`Student registration verification failed: activation code mismatch`);
      throw genericFailure;
    }

    if (student.accountClaimedAt) {
      throw new ConflictException({
        code: 'STUDENT_ALREADY_REGISTERED',
        message: 'تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة',
      });
    }

    const registrationToken = await this.jwtService.signAsync(
      { sub: student.id, typ: 'student_registration' } satisfies StudentRegistrationTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('STUDENT_REGISTRATION_TOKEN_EXPIRES_IN', '10m'),
      },
    );

    return {
      registrationToken,
      studentCode: student.studentCode || '',
      fullName: student.user.fullName,
      gradeLevel: student.gradeLevel,
    };
  }

  /**
   * STEP 2 — Claims the student account atomically and sets the credentials.
   *
   * Concurrency safety: the claim is a single conditional UPDATE
   * (`account_claimed_at IS NULL AND registration_code_hash IS NOT NULL`).
   * Two simultaneous registration attempts for the same student cannot both
   * match — the loser receives a conflict. Unique constraints on
   * `users.phone` / `users.email` are the final defense against identifier
   * duplication (P2002).
   *
   * Role is never accepted from the client: the account keeps its
   * server-assigned STUDENT role.
   */
  async registerStudentAccount(dto: RegisterStudentAccountDto): Promise<AuthTokensResponseDto> {
    const payload = await this.verifyRegistrationToken(dto.registrationToken);

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        // 1. Atomic one-time claim of the pending student record
        const claim = await tx.studentProfile.updateMany({
          where: {
            id: payload.sub,
            accountClaimedAt: null,
            registrationCodeHash: { not: null },
          },
          data: {
            accountClaimedAt: new Date(),
            registrationCodeHash: null,
          },
        });

        if (claim.count === 0) {
          throw new ConflictException({
            code: 'STUDENT_ALREADY_REGISTERED',
            message: 'تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة',
          });
        }

        // 2. Load the claimed record (shared PK between users & student_profiles)
        const student = await tx.studentProfile.findUnique({
          where: { id: payload.sub },
          select: { user: { select: { id: true, phone: true, email: true, role: true } } },
        });

        if (!student) {
          throw new ConflictException({
            code: 'STUDENT_ALREADY_REGISTERED',
            message: 'تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة',
          });
        }

        const phone = dto.phone?.trim() || undefined;
        const email = dto.email?.trim().toLowerCase() || undefined;

        // 3. The account must end up with at least one login identifier
        if (!phone && !email && !student.user.phone && !student.user.email) {
          throw new BadRequestException({
            code: 'IDENTIFIER_REQUIRED',
            message: 'يجب إدخال رقم هاتف أو بريد إلكتروني ليكون وسيلة تسجيل الدخول',
          });
        }

        // 4. Friendly pre-checks for identifier collisions (P2002 remains the safety net)
        if (phone && phone !== student.user.phone) {
          const existing = await tx.user.findUnique({ where: { phone } });
          if (existing) {
            throw new ConflictException({
              code: 'PHONE_ALREADY_IN_USE',
              message: 'رقم الهاتف مستخدم بالفعل في حساب آخر',
            });
          }
        }

        if (email && email !== student.user.email) {
          const existing = await tx.user.findUnique({ where: { email } });
          if (existing) {
            throw new ConflictException({
              code: 'EMAIL_ALREADY_IN_USE',
              message: 'البريد الإلكتروني مستخدم بالفعل في حساب آخر',
            });
          }
        }

        // 5. Set credentials. Role/academic data are NOT client-controllable.
        return tx.user.update({
          where: { id: student.user.id },
          data: {
            ...(phone !== undefined ? { phone } : {}),
            ...(email !== undefined ? { email } : {}),
            passwordHash: await bcrypt.hash(dto.password, 10),
          },
          include: {
            teacherProfile: { select: { id: true } },
            studentProfile: { select: { id: true } },
            parentProfile: { select: { id: true } },
            secretariatProfile: { select: { id: true } },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'IDENTIFIER_ALREADY_IN_USE',
          message: 'وسيلة تسجيل الدخول المدخلة مستخدمة بالفعل في حساب آخر',
        });
      }
      throw error;
    }

    this.logger.log(`Student self-registration completed for user [${user.id}]`);

    // 6. Auto-authenticate: issue the standard access/refresh token pair
    return this.authService.issueTokens(user);
  }

  private async verifyRegistrationToken(token: string): Promise<StudentRegistrationTokenPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<StudentRegistrationTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      if (decoded.typ !== 'student_registration' || !decoded.sub) {
        throw new UnauthorizedException({
          code: 'REGISTRATION_TOKEN_INVALID',
          message: 'انتهت صلاحية جلسة التحقق، يرجى إعادة المحاولة',
        });
      }

      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({
        code: 'REGISTRATION_TOKEN_INVALID',
        message: 'انتهت صلاحية جلسة التحقق، يرجى إعادة المحاولة',
      });
    }
  }
}
