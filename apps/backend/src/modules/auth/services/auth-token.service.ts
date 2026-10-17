import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { parseDurationToMs } from '../helpers/auth-phone.helper';

export interface JwtTokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  typ: 'access' | 'refresh';
  jti?: string;
}

export interface AuthUserRecord {
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

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Issues a signed access/refresh token pair and persists the refresh session.
   */
  async issueTokens(user: AuthUserRecord, overrideRole?: UserRole): Promise<AuthTokensResponseDto> {
    const effectiveRole = overrideRole || user.role;
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const accessPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: effectiveRole,
      typ: 'access',
    };

    const refreshPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: effectiveRole,
      typ: 'refresh',
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiry as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiry as any,
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
    if (effectiveRole === UserRole.SECRETARIAT || user.role === UserRole.SECRETARIAT) {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: user.id, status: 'ACTIVE' },
        select: { permissions: true },
      });
      if (link?.permissions) {
        permissions = link.permissions;
      }
    }

    let teacherProfileId = user.teacherProfile?.id;
    let studentProfileId = user.studentProfile?.id;
    let parentProfileId = user.parentProfile?.id;
    let secretariatProfileId = user.secretariatProfile?.id;

    if (!secretariatProfileId || !parentProfileId || !teacherProfileId || !studentProfileId) {
      const fullUserProfiles = typeof this.prisma.user?.findUnique === 'function'
        ? await this.prisma.user.findUnique({
            where: { id: user.id },
            select: {
              teacherProfile: { select: { id: true } },
              studentProfile: { select: { id: true } },
              parentProfile: { select: { id: true } },
              secretariatProfile: { select: { id: true } },
              assistantToTeachers: { where: { status: 'ACTIVE' }, take: 1, select: { id: true } },
            },
          })
        : null;
      if (fullUserProfiles) {
        if (!teacherProfileId) teacherProfileId = fullUserProfiles.teacherProfile?.id;
        if (!studentProfileId) studentProfileId = fullUserProfiles.studentProfile?.id;
        if (!parentProfileId) parentProfileId = fullUserProfiles.parentProfile?.id;
        if (!secretariatProfileId) {
          secretariatProfileId =
            fullUserProfiles.secretariatProfile?.id ||
            (fullUserProfiles.assistantToTeachers && fullUserProfiles.assistantToTeachers.length > 0 ? user.id : undefined);
        }
      }
    }

    if (effectiveRole === UserRole.TEACHER) {
      parentProfileId = undefined;
      studentProfileId = undefined;
      secretariatProfileId = undefined;
    } else if (effectiveRole === UserRole.STUDENT) {
      parentProfileId = undefined;
      teacherProfileId = undefined;
      secretariatProfileId = undefined;
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
        role: effectiveRole,
        teacherProfileId,
        studentProfileId,
        parentProfileId,
        secretariatProfileId,
        permissions,
      },
    };
  }

  /**
   * Switches the active role of the currently authenticated user.
   */
  async switchRole(userId: string, targetRole: UserRole): Promise<AuthTokensResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
      include: {
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true } },
        parentProfile: { select: { id: true } },
        secretariatProfile: { select: { id: true } },
        assistantToTeachers: { where: { status: 'ACTIVE' }, take: 1, select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('الحساب غير موجود أو غير مفعل');
    }

    if (user.role === UserRole.STUDENT || user.role === UserRole.TEACHER || targetRole === UserRole.STUDENT || targetRole === UserRole.TEACHER) {
      throw new BadRequestException('ليس لديك صلاحية التبديل إلى هذا الدور');
    }

    const hasAssistantLink = Boolean(user.assistantToTeachers && user.assistantToTeachers.length > 0);
    const hasParentLink = await this.prisma.parentStudentLink.findFirst({
      where: { parentId: user.id },
      select: { id: true },
    });

    const roleProfileMap: Record<string, boolean> = {
      [UserRole.PARENT]: Boolean(user.parentProfile) || Boolean(hasParentLink) || user.role === UserRole.PARENT,
      [UserRole.SECRETARIAT]: Boolean(user.secretariatProfile) || hasAssistantLink || user.role === UserRole.SECRETARIAT,
    };

    if (!roleProfileMap[targetRole]) {
      throw new BadRequestException('ليس لديك صلاحية التبديل إلى هذا الدور');
    }

    if (targetRole === UserRole.SECRETARIAT && !user.secretariatProfile && (hasAssistantLink || user.role === UserRole.SECRETARIAT)) {
      const sp = await this.prisma.secretariatProfile.upsert({
        where: { id: user.id },
        create: { id: user.id, staffTitle: 'مساعد معلم' },
        update: {},
      });
      user.secretariatProfile = { id: sp.id };
    }

    if (targetRole === UserRole.PARENT && !user.parentProfile && (hasParentLink || user.role === UserRole.PARENT)) {
      const pp = await this.prisma.parentProfile.upsert({
        where: { id: user.id },
        create: { id: user.id, relationshipType: 'ولي أمر' },
        update: {},
      });
      user.parentProfile = { id: pp.id };
    }

    return this.issueTokens(user, targetRole);
  }

  /**
   * Validates refresh token signature, checks session & reuse, and issues fresh rotated token pair.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

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

    if (existingSession.revokedAt) {
      if (existingSession.replacedById) {
        let currentReplacementId: string | null = existingSession.replacedById;
        let activeReplacement = null;
        let hops = 0;

        while (currentReplacementId && hops < 5) {
          const replacement = await this.prisma.refreshTokenSession.findUnique({
            where: { id: currentReplacementId },
          });

          if (!replacement) break;

          if (!replacement.revokedAt && replacement.expiresAt > new Date()) {
            activeReplacement = replacement;
            break;
          }

          currentReplacementId = replacement.replacedById;
          hops++;
        }

        if (activeReplacement) {
          this.logger.log(
            `Client presented previously rotated session for user ${existingSession.userId}; safely healed to active replacement session ${activeReplacement.id}`,
          );

          const user = await this.prisma.user.findUnique({
            where: { id: decoded.sub },
          });

          if (user && user.isActive && !user.deletedAt) {
            let effectiveRole = user.role;
            if (decoded.role && decoded.role !== user.role) {
              effectiveRole = decoded.role as UserRole;
            }
            const accessPayload: JwtTokenPayload = {
              sub: user.id,
              email: user.email || undefined,
              phone: user.phone || undefined,
              role: effectiveRole,
              typ: 'access',
            };
            const accessToken = await this.jwtService.signAsync(accessPayload, {
              secret: accessSecret,
              expiresIn: accessExpiry as any,
            });

            return {
              accessToken,
              refreshToken: dto.refreshToken,
            };
          }
        }
      }

      this.logger.warn(
        `Revoked refresh token presented for user ${existingSession.userId}. Rejecting single request without wiping active devices.`,
      );
      throw new UnauthorizedException('Refresh token was revoked or expired');
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

    let effectiveRole = user.role;
    if (decoded.role && decoded.role !== user.role) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          teacherProfile: { select: { id: true } },
          studentProfile: { select: { id: true } },
          parentProfile: { select: { id: true } },
          secretariatProfile: { select: { id: true } },
        },
      });
      const roleProfileMap: Record<string, boolean> = {
        [UserRole.TEACHER]: Boolean(fullUser?.teacherProfile),
        [UserRole.STUDENT]: Boolean(fullUser?.studentProfile),
        [UserRole.PARENT]: Boolean(fullUser?.parentProfile),
        [UserRole.SECRETARIAT]: Boolean(fullUser?.secretariatProfile),
      };
      if (roleProfileMap[decoded.role as string]) {
        effectiveRole = decoded.role as UserRole;
      }
    }

    const accessPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: effectiveRole,
      typ: 'access',
    };

    const newRefreshJti = randomUUID();
    const newRefreshPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: effectiveRole,
      typ: 'refresh',
      jti: newRefreshJti,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiry as any,
      }),
      this.jwtService.signAsync(newRefreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiry as any,
      }),
    ]);

    const refreshExpiryMs = parseDurationToMs(refreshExpiry);
    const newExpiresAt = new Date(Date.now() + refreshExpiryMs);
    const newTokenHash = this.hashToken(newRefreshToken);

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
}
