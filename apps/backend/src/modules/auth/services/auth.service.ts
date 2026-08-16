import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';

export interface LoginDto {
  identifier: string; // phone or email
  password?: string;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto): Promise<AuthTokensResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials or account is inactive');
    }

    return {
      accessToken: 'jwt-access-token-placeholder',
      refreshToken: 'jwt-refresh-token-placeholder',
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return {
      accessToken: 'new-jwt-access-token-placeholder',
    };
  }
}
