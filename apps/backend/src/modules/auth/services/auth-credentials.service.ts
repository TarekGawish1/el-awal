import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { getPhoneVariants } from '../helpers/auth-phone.helper';
import { AuthTokenService } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class AuthCredentialsService {
  private readonly logger = new Logger(AuthCredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AuthTokenService,
    private readonly sessionService: AuthSessionService,
  ) {}

  /**
   * Helper utility to hash passwords with standard bcrypt salt rounds (10).
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Authenticates user using email or phone and password.
   * Compares password with stored bcrypt hash and generates access & refresh tokens.
   */
  async login(dto: LoginDto): Promise<AuthTokensResponseDto> {
    const rawIdentifier = dto.identifier.trim();
    this.sessionService.checkAccountLockout(rawIdentifier);
    const phoneVariants = getPhoneVariants(rawIdentifier);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          { email: rawIdentifier },
          { studentProfile: { studentCode: rawIdentifier } },
        ],
        isActive: true,
        deletedAt: null,
      },
      include: {
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true, tempAccessPin: true, pinExpiresAt: true } },
        parentProfile: {
          select: {
            id: true,
            studentLinks: {
              include: {
                student: {
                  include: {
                    user: { select: { passwordHash: true, phone: true } },
                  },
                },
              },
            },
          },
        },
        secretariatProfile: { select: { id: true } },
      },
    });

    if (!user) {
      this.logger.warn(`Authentication failed: User [${dto.identifier}] not found or inactive`);
      this.sessionService.recordFailedAttempt(rawIdentifier);
    }

    if (!dto.password) {
      throw new UnauthorizedException('كلمة المرور مطلوبة');
    }

    let isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    // If password doesn't match own passwordHash:
    // A) Check student temporary access PIN if user is a student (enforce 48h expiration)
    if (!isPasswordValid && user.studentProfile?.tempAccessPin) {
      const isPinExpired =
        user.studentProfile.pinExpiresAt && new Date(user.studentProfile.pinExpiresAt) < new Date();
      if (!isPinExpired && user.studentProfile.tempAccessPin === dto.password) {
        isPasswordValid = true;
      }
    }

    // B) Check linked student's password or tempAccessPin if user has a parentProfile
    let authenticatedAsParentViaStudentPin = false;
    if (!isPasswordValid && user.parentProfile?.studentLinks?.length) {
      for (const link of user.parentProfile.studentLinks) {
        if (link.student?.user?.passwordHash) {
          const match = await bcrypt.compare(dto.password, link.student.user.passwordHash);
          if (match) {
            isPasswordValid = true;
            authenticatedAsParentViaStudentPin = true;
            break;
          }
        }
        const isPinExpired =
          link.student?.pinExpiresAt && new Date(link.student.pinExpiresAt) < new Date();
        if (
          !isPinExpired &&
          link.student?.tempAccessPin &&
          link.student.tempAccessPin === dto.password
        ) {
          isPasswordValid = true;
          authenticatedAsParentViaStudentPin = true;
          break;
        }
      }
    }

    if (!isPasswordValid) {
      this.logger.warn(`Authentication failed: Invalid password for user [${dto.identifier}]`);
      this.sessionService.recordFailedAttempt(rawIdentifier);
    }

    // Clear tempAccessPin and pendingCredentials upon verified login with real password
    // or when the temporary access PIN retention window has expired
    if (
      user.studentProfile &&
      (user.studentProfile.tempAccessPin || (user.studentProfile as any).pendingCredentials)
    ) {
      const usedTempPin = user.studentProfile.tempAccessPin === dto.password;
      const isPinExpired = user.studentProfile.pinExpiresAt
        ? new Date(user.studentProfile.pinExpiresAt) < new Date()
        : false;

      if (!usedTempPin || isPinExpired) {
        await this.prisma.studentProfile
          .update({
            where: { id: user.studentProfile.id },
            data: {
              tempAccessPin: null,
              pinExpiresAt: null,
              pendingCredentials: null,
            },
          })
          .catch((err) =>
            this.logger.warn('Failed to clear tempAccessPin upon verified password login:', err),
          );
      }
    }

    this.sessionService.clearFailedAttempts(rawIdentifier);
    const overrideRole = authenticatedAsParentViaStudentPin ? UserRole.PARENT : undefined;
    return this.tokenService.issueTokens(user, overrideRole);
  }

  /**
   * Authenticates through an administration-created student/parent linkage or direct parent lookup.
   * Requires matching parent or student password to ensure secure authenticated access.
   */
  async parentAccess(dto: ParentAccessDto): Promise<AuthTokensResponseDto> {
    const rawIdentifier = (dto.studentPhone || '').trim();
    this.sessionService.checkAccountLockout(rawIdentifier);
    const password = (dto.password || '').trim();
    const phoneVariants = getPhoneVariants(rawIdentifier);

    if (!password) {
      this.logger.warn(`Parent access failed: missing password for identifier [${rawIdentifier}]`);
      throw new UnauthorizedException('يرجى إدخال كلمة المرور لتأكيد الدخول');
    }

    // 1. Try finding parent linked to student by student phone, student code, or emergency phone
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { user: { phone: { in: phoneVariants }, isActive: true, deletedAt: null } },
          { studentCode: rawIdentifier },
          { emergencyPhone: { in: phoneVariants } },
        ],
      },
      select: {
        user: { select: { passwordHash: true } },
        parentLinks: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            parent: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    deletedAt: true,
                    passwordHash: true,
                    parentProfile: { select: { id: true } },
                    secretariatProfile: { select: { id: true } },
                    teacherProfile: { select: { id: true } },
                    studentProfile: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let parentUser = student?.parentLinks[0]?.parent?.user;

    // 2. If not found via student links, try finding parent user directly by phone
    if (!parentUser) {
      const directParent = await this.prisma.user.findFirst({
        where: {
          phone: { in: phoneVariants },
          OR: [
            { role: UserRole.PARENT },
            { parentProfile: { isNot: null } },
          ],
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          deletedAt: true,
          passwordHash: true,
          parentProfile: { select: { id: true } },
          secretariatProfile: { select: { id: true } },
          teacherProfile: { select: { id: true } },
          studentProfile: { select: { id: true } },
        },
      });

      if (directParent) {
        parentUser = directParent;
      }
    }

    const hasParentCapability = parentUser?.role === UserRole.PARENT || Boolean(parentUser?.parentProfile);
    if (!parentUser || !hasParentCapability || !parentUser.isActive || parentUser.deletedAt) {
      this.logger.warn(`Parent access failed for identifier [${dto.studentPhone}]`);
      this.sessionService.recordFailedAttempt(rawIdentifier);
    }

    // 3. Authenticate with password verification:
    // Check parent's own password FIRST
    let isPasswordValid = await bcrypt.compare(password, parentUser.passwordHash);

    // If not matched, check ANY of the parent's linked students' passwords or temporary access PINs
    if (!isPasswordValid) {
      const linkedStudents = await this.prisma.parentStudentLink.findMany({
        where: { parentId: parentUser.id },
        include: {
          student: {
            include: {
              user: { select: { passwordHash: true, phone: true } },
            },
          },
        },
      });

      for (const link of linkedStudents) {
        if (link.student?.user?.passwordHash) {
          const match = await bcrypt.compare(password, link.student.user.passwordHash);
          if (match) {
            isPasswordValid = true;
            break;
          }
        }
        const isPinExpired =
          link.student?.pinExpiresAt && new Date(link.student.pinExpiresAt) < new Date();
        if (
          !isPinExpired &&
          link.student?.tempAccessPin &&
          link.student.tempAccessPin === password
        ) {
          isPasswordValid = true;
          break;
        }
      }
    }

    if (!isPasswordValid) {
      this.logger.warn(`Parent access failed: invalid password for identifier [${rawIdentifier}]`);
      this.sessionService.recordFailedAttempt(rawIdentifier);
    }

    this.sessionService.clearFailedAttempts(rawIdentifier);
    return this.tokenService.issueTokens(parentUser, UserRole.PARENT);
  }
}
