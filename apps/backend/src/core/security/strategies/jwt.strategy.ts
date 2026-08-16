import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-default-jwt-key-change-in-prod'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true } },
        parentProfile: { select: { id: true } },
        secretariatProfile: { select: { id: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is deactivated, invalid, or deleted');
    }

    return {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      teacherProfileId: user.teacherProfile?.id,
      studentProfileId: user.studentProfile?.id,
      parentProfileId: user.parentProfile?.id,
      secretariatProfileId: user.secretariatProfile?.id,
    };
  }
}
