import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

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
      expiresIn: 900, // 15 minutes in seconds
      user: userProfile,
    };
  }

  /**
   * Validates refresh token signature, checks user active status, and issues fresh token pair.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtTokenPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-change-in-production-env'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException('User account is inactive or no longer exists');
      }

      const payload: JwtTokenPayload = {
        sub: user.id,
        email: user.email || undefined,
        phone: user.phone || undefined,
        role: user.role,
      };

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        }),
        this.jwtService.signAsync(payload, {
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        }),
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Refresh token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Helper utility to hash passwords with standard bcrypt salt rounds (10).
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
