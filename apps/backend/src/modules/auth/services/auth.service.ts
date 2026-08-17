import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensResponseDto, AuthUserDto } from '../dto/auth-response.dto';
import { UserRole } from '@prisma/client';

export interface JwtTokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  typ: 'access' | 'refresh';
  jti?: string;
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
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Authentication failed: Invalid password for user [${dto.identifier}]`);
      throw new UnauthorizedException('Invalid credentials or account is inactive');
    }

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

    const refreshJti = randomUUID();
    const refreshPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      typ: 'refresh',
      jti: refreshJti,
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

    // Track refresh token session in database
    const refreshExpiryMs = parseDurationToMs(refreshExpiry);
    const expiresAt = new Date(Date.now() + refreshExpiryMs);
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshTokenSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const userProfile: AuthUserDto = {
      id: user.id,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      teacherProfileId: user.teacherProfile?.id,
      studentProfileId: user.studentProfile?.id,
      parentProfileId: user.parentProfile?.id,
      secretariatProfileId: user.secretariatProfile?.id,
    };

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(parseDurationToMs(accessExpiry) / 1000),
      user: userProfile,
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
}
