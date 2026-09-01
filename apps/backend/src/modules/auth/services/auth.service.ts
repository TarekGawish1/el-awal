import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { RegisterByGroupDto } from '../dto/register-by-group.dto';
import { normalizeEgyptianPhone } from '../../../common/utils/phone.util';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

export interface JwtTokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  typ: 'access' | 'refresh';
  jti?: string;
}

interface AuthUserRecord {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  teacherProfile?: { id: string } | null;
  studentProfile?: { id: string } | null;
  parentProfile?: { id: string } | null;
  secretariatProfile?: { id: string } | null;
}

function getPhoneVariants(phone: string): string[] {
  const normalized = phone.replace(/[\s-]/g, '').trim();
  const nationalNumber = normalized.startsWith('+20')
    ? normalized.slice(3)
    : normalized.startsWith('0020')
      ? normalized.slice(4)
      : normalized.startsWith('0')
        ? normalized.slice(1)
        : normalized;

  return [...new Set([
    normalized,
    `0${nationalNumber}`,
    `+20${nationalNumber}`,
    `0020${nationalNumber}`,
  ])];
}

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Authenticates user using email or phone and password.
   * Compares password with stored bcrypt hash and generates access & refresh tokens.
   */
  async login(dto: LoginDto): Promise<AuthTokensResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.identifier },
          { email: dto.identifier },
          { studentProfile: { studentCode: dto.identifier } },
        ],
        isActive: true,
        deletedAt: null,
      },
      include: {
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true } },
        parentProfile: { select: { id: true } },
        secretariatProfile: { select: { id: true } },
      },
    });

    if (!user) {
      this.logger.warn(`Authentication failed: User [${dto.identifier}] not found or inactive`);
      throw new UnauthorizedException('Invalid credentials or account is inactive');
    }

    if (!dto.password) {
      throw new UnauthorizedException('كلمة المرور مطلوبة');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Authentication failed: Invalid password for user [${dto.identifier}]`);
      throw new UnauthorizedException('بيانات الدخول غير صحيحة أو الحساب غير نشط');
    }

    return this.issueTokens(user);
  }

  /**
   * Authenticates through an administration-created student/parent linkage or direct parent lookup.
   * Requires matching parent or student password to ensure secure authenticated access.
   */
  async parentAccess(dto: ParentAccessDto): Promise<AuthTokensResponseDto> {
    const rawIdentifier = (dto.studentPhone || '').trim();
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
        user: {
          select: {
            passwordHash: true,
          },
        },
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
                  },
                },
              },
            },
          },
        },
      },
    });

    let parentUser = student?.parentLinks[0]?.parent?.user;
    const studentUser = student?.user;

    // 2. If not found via student links, try finding parent user directly by phone
    if (!parentUser) {
      const directParent = await this.prisma.user.findFirst({
        where: {
          phone: { in: phoneVariants },
          role: UserRole.PARENT,
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
        },
      });

      if (directParent) {
        parentUser = directParent;
      }
    }

    if (!parentUser || parentUser.role !== UserRole.PARENT || !parentUser.isActive || parentUser.deletedAt) {
      this.logger.warn(`Parent access failed for identifier [${dto.studentPhone}]`);
      throw new UnauthorizedException('رقم الهاتف أو كود الطالب غير مسجل أو لا يوجد حساب ولي أمر مرتبط به');
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
              user: {
                select: { passwordHash: true, phone: true },
              },
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
        if (link.student?.tempAccessPin && link.student.tempAccessPin === password) {
          isPasswordValid = true;
          break;
        }
      }
    }

    if (!isPasswordValid) {
      this.logger.warn(`Parent access failed: invalid password for identifier [${rawIdentifier}]`);
      throw new UnauthorizedException('كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور أو استخدام رابط الدخول الآمن');
    }

    return this.issueTokens(parentUser);
  }

  /**
   * Issues a signed access/refresh token pair and persists the refresh session.
   * Public so the student self-registration flow can auto-authenticate after
   * a successful account claim.
   */
  async issueTokens(user: AuthUserRecord): Promise<AuthTokensResponseDto> {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const accessPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      typ: 'access',
    };

    const refreshPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      typ: 'refresh',
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiry,
      }),
    ]);

    const refreshExpiryMs = parseDurationToMs(refreshExpiry);
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshTokenSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshExpiryMs),
      },
    });

    let permissions: string[] = [];
    if (user.role === UserRole.SECRETARIAT) {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: user.id, status: 'ACTIVE' },
        select: { permissions: true },
      });
      if (link?.permissions) {
        permissions = link.permissions;
      }
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(parseDurationToMs(accessExpiry) / 1000),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email || undefined,
        phone: user.phone || undefined,
        role: user.role,
        teacherProfileId: user.teacherProfile?.id,
        studentProfileId: user.studentProfile?.id,
        parentProfileId: user.parentProfile?.id,
        secretariatProfileId: user.secretariatProfile?.id,
        permissions,
      },
    };
  }

  /**
   * Validates refresh token signature, checks session & reuse, and issues fresh rotated token pair.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    let decoded: JwtTokenPayload;
    try {
      decoded = await this.jwtService.verifyAsync<JwtTokenPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch (error) {
      this.logger.error('Refresh token signature verification failed:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type for refresh endpoint');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const existingSession = await this.prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
    });

    if (!existingSession) {
      this.logger.warn(`Refresh session not found for token hash`);
      throw new UnauthorizedException('Invalid refresh session');
    }

    // Reuse detection: If token was already revoked, revoke all active sessions for this user!
    if (existingSession.revokedAt) {
      this.logger.error(`Suspicious refresh token reuse detected for user ${existingSession.userId}. Revoking all sessions.`);
      await this.prisma.refreshTokenSession.updateMany({
        where: { userId: existingSession.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token was revoked or reused');
    }

    if (existingSession.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or no longer exists');
    }

    const accessPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      typ: 'access',
    };

    const newRefreshJti = randomUUID();
    const newRefreshPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      typ: 'refresh',
      jti: newRefreshJti,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(newRefreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiry,
      }),
    ]);

    const refreshExpiryMs = parseDurationToMs(refreshExpiry);
    const newExpiresAt = new Date(Date.now() + refreshExpiryMs);
    const newTokenHash = this.hashToken(newRefreshToken);

    // Create new session and link previous session to it
    const newSession = await this.prisma.refreshTokenSession.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    await this.prisma.refreshTokenSession.update({
      where: { id: existingSession.id },
      data: {
        revokedAt: new Date(),
        replacedById: newSession.id,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes the given refresh token session on logout.
   */
  async logout(dto: RefreshTokenDto): Promise<{ success: boolean; message: string }> {
    const tokenHash = this.hashToken(dto.refreshToken);
    await this.prisma.refreshTokenSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Revokes all active refresh token sessions for a specific user.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Helper utility to hash passwords with standard bcrypt salt rounds (10).
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Resolves the Arabic academic stage label from an Egyptian grade level.
   */
  private deriveStageLabel(gradeLevel: string): string {
    if (!gradeLevel) return 'غير محدد';
    if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
    if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
    if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
    return 'أخرى';
  }

  /**
   * Resolves the stored academic stage code from an Egyptian grade level.
   */
  private deriveStageCode(gradeLevel: string): string | null {
    if (gradeLevel.includes('الابتدائي')) return 'PRIMARY';
    if (gradeLevel.includes('الإعدادي')) return 'MIDDLE';
    if (gradeLevel.includes('الثانوي')) return 'SECONDARY';
    return null;
  }

  /**
   * Public endpoint payload for the group self-registration view.
   * Validates the invite token, registration window and group state without
   * requiring authentication.
   */
  async getGroupInvite(token: string): Promise<{
    groupId: string;
    groupName: string;
    gradeLevel: string;
    stage: string;
    teacherName: string;
    monthlyFee: number;
    isValid: boolean;
  }> {
    const group = await this.prisma.academicGroup.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        monthlyFee: true,
        isActive: true,
        isRegistrationOpen: true,
        registrationLinkExpiry: true,
        teacher: { select: { user: { select: { fullName: true } } } },
      },
    });

    const now = new Date();
    const isValid =
      !!group &&
      group.isActive &&
      group.isRegistrationOpen &&
      (!group.registrationLinkExpiry || group.registrationLinkExpiry.getTime() > now.getTime());

    return {
      groupId: group?.id || '',
      groupName: group?.name || '',
      gradeLevel: group?.gradeLevel || '',
      stage: group ? this.deriveStageLabel(group.gradeLevel) : '',
      teacherName: group?.teacher?.user?.fullName || '',
      monthlyFee: group ? Number(group.monthlyFee) : 0,
      isValid,
    };
  }

  /**
   * Group-invite self-registration: validates the invite token, then atomically
   * creates the Student User + StudentProfile, creates or links the Parent
   * User + ParentProfile, and enrolls the student (ACTIVE) into the group in a
   * single Prisma transaction. Returns JWT tokens for immediate sign-in.
   */
  async registerByGroup(dto: RegisterByGroupDto): Promise<AuthTokensResponseDto> {
    const phone = normalizeEgyptianPhone(dto.phone);
    const parentPhone = normalizeEgyptianPhone(dto.parentPhone);
    const fullName = dto.fullName.trim();
    const parentName = dto.parentName.trim();

    if (phone === parentPhone) {
      throw new ConflictException({
        code: 'PHONES_MUST_DIFFER',
        message: 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب',
      });
    }

    const group = await this.prisma.academicGroup.findUnique({
      where: { registrationToken: dto.token },
    });

    const now = new Date();
    const isLinkExpired =
      !!group?.registrationLinkExpiry && group.registrationLinkExpiry.getTime() < now.getTime();

    if (!group || !group.isActive) {
      throw new BadRequestException({
        code: 'INVALID_INVITE_TOKEN',
        message: 'رابط التسجيل غير صالح، يرجى طلب رابط جديد من المدرس',
      });
    }

    if (!group.isRegistrationOpen || isLinkExpired) {
      throw new BadRequestException({
        code: 'REGISTRATION_CLOSED',
        message: 'التسجيل في هذه المجموعة مغلق حالياً',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let generatedParentPassword: string | null = null;
    let studentUser;
    try {
      studentUser = await this.prisma.$transaction(async (tx) => {
        // 1. Student phone must not already belong to any account (anti-duplicate)
        const existingStudent = await tx.user.findFirst({
          where: { phone: { in: getPhoneVariants(phone) } },
          select: { id: true, role: true },
        });
        if (existingStudent) {
          throw new ConflictException({
            code: 'PHONE_ALREADY_REGISTERED',
            message: 'رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة',
          });
        }

        // 2. Generate unique student code and QR credential
        const studentCode = await generateUniqueStudentCode(tx);
        const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

        // 3. Create Student User + StudentProfile (shared primary key)
        const createdStudentUser = await tx.user.create({
          data: {
            fullName,
            phone,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                studentCode,
                qrCodeToken,
                gradeLevel: group.gradeLevel,
                academicStage: this.deriveStageCode(group.gradeLevel),
                attendanceMode: 'CENTER',
                emergencyPhone: parentPhone,
                tempAccessPin: dto.password,
                pinExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          include: { studentProfile: true },
        });

        // 4. Resolve parent: reuse an existing parent by phone or create one
        let parentUserId: string;
        const existingParent = await tx.user.findFirst({
          where: { phone: { in: getPhoneVariants(parentPhone) } },
          select: { id: true, role: true, deletedAt: true },
        });

        if (existingParent) {
          if (existingParent.deletedAt) {
            await tx.user.update({
              where: { id: existingParent.id },
              data: { deletedAt: null, isActive: true },
            });
          }
          parentUserId = existingParent.id;

          const parentProfile = await tx.parentProfile.findUnique({
            where: { id: parentUserId },
            select: { id: true },
          });
          if (!parentProfile) {
            await tx.parentProfile.create({
              data: { id: parentUserId, relationshipType: 'ولي أمر' },
            });
          }
        } else {
          const parentPassword = generateSecurePassword();
          generatedParentPassword = parentPassword;
          const parentPasswordHash = await bcrypt.hash(parentPassword, 10);
          const newParentUser = await tx.user.create({
            data: {
              fullName: parentName,
              phone: parentPhone,
              passwordHash: parentPasswordHash,
              role: UserRole.PARENT,
              isActive: true,
              parentProfile: {
                create: { relationshipType: 'ولي أمر' },
              },
            },
          });
          parentUserId = newParentUser.id;

          // Persist one-time parent credentials so they can be dispatched via
          // WhatsApp when the teacher approves the enrollment
          await tx.studentProfile.update({
            where: { id: createdStudentUser.id },
            data: {
              pendingCredentials: {
                studentPassword: null,
                parentPassword,
                studentPhone: phone,
                parentPhone,
              },
            },
          });
        }

        // 5. Link parent ↔ student
        await tx.parentStudentLink.create({
          data: { parentId: parentUserId, studentId: createdStudentUser.id },
        });

        // 6. Enroll the student directly into the group (ACTIVE)
        await tx.groupEnrollment.upsert({
          where: {
            groupId_studentId: {
              groupId: group.id,
              studentId: createdStudentUser.id,
            },
          },
          create: {
            groupId: group.id,
            studentId: createdStudentUser.id,
            status: GroupEnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
          update: {
            status: GroupEnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
        });

        return createdStudentUser;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn('Group registration collided on a unique constraint');
        throw new ConflictException({
          code: 'IDENTIFIER_ALREADY_IN_USE',
          message: 'رقم الهاتف مستخدم بالفعل، يرجى المحاولة مرة أخرى',
        });
      }
      throw error;
    }

    this.logger.log(`Group self-registration completed for [${fullName}] into group [${group.id}]`);

    // Automated Parent WhatsApp Delivery on Group Registration
    try {
      let teacherDisplayName = 'الأستاذ';
      const teacherUser = await this.prisma.user.findUnique({
        where: { id: group.teacherId },
        select: { fullName: true },
      });
      if (teacherUser?.fullName) {
        teacherDisplayName = teacherUser.fullName;
      }

      const studentCode = studentUser.studentProfile?.studentCode || '';
      const parentPassText = generatedParentPassword || dto.password;
      const directAccessLink = `https://al-awal.online/parent-access?phone=${encodeURIComponent(parentPhone)}&pass=${encodeURIComponent(parentPassText)}`;

      const message = `🌟 مرحباً بك أ/ ${parentName}!
تم تسجيل انضمام ابنكم/ابنتكم (${fullName}) بنجاح إلى:
🏫 *${group.name}* مع *${teacherDisplayName}* على منصة الأوّل.

━━━━━━━━━━━━━━━━━━━
👤 *بيانات حساب الطالب:*
▫️ *كود الطالب:* ${studentCode}
▫️ *رقم الدخول:* ${phone}
▫️ *كلمة المرور:* ${dto.password}
🔗 *رابط منصة الطالب:* https://al-awal.online/login

━━━━━━━━━━━━━━━━━━━
👨‍👩‍👦 *بيانات حساب ولي الأمر (لمتابعة الحضور والدرجات والغياب):*
▫️ *رقم الدخول:* ${parentPhone}
▫️ *كلمة المرور:* ${parentPassText}
🔗 *رابط بوابة ولي الأمر المباشر:* ${directAccessLink}
━━━━━━━━━━━━━━━━━━━
نتمنى لابنكم عاماً دراسياً مليئاً بالتفوق والنجاح! 🎓`.trim();

        // Queue registration credentials via NotificationsService
        await this.notificationsService.sendNotification({
          recipientId: studentUser.id,
          type: 'STUDENT_REGISTRATION_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `🎉 مرحباً بك! بيانات دخول الطالب ${dto.fullName}`,
          body: message,
          channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
          data: {
            studentId: studentUser.id,
            studentName: dto.fullName,
            studentPhoneOrCode: phone,
            studentPassword: dto.password,
            parentPhone,
            parentPassword: parentPassText,
            parentName: `ولي أمر ${dto.fullName}`,
            centerName: group.name ? `مجموعة ${group.name}` : 'منصة الأوّل التعليمية',
            groupName: group.name,
            platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
            phone: parentPhone || phone,
          },
        });
      } catch (waErr) {
        this.logger.warn(`Failed to dispatch registration WhatsApp message to parent: ${waErr}`);
      }

      return this.issueTokens({
        id: studentUser.id,
        fullName: studentUser.fullName,
        email: null,
        phone: studentUser.phone,
        role: UserRole.STUDENT,
        studentProfile: { id: studentUser.id },
      });
    }
  }
