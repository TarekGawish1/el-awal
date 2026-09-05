import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  phone?: string;
  typ?: string;
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
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.typ && payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
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

    let effectiveRole = user.role;
    if (payload.role) {
      const isQualified =
        payload.role === user.role ||
        (payload.role === UserRole.PARENT && Boolean(user.parentProfile)) ||
        (payload.role === UserRole.TEACHER && Boolean(user.teacherProfile)) ||
        (payload.role === UserRole.STUDENT && Boolean(user.studentProfile)) ||
        (payload.role === UserRole.SECRETARIAT && Boolean(user.secretariatProfile));
      if (isQualified) {
        effectiveRole = payload.role as UserRole;
      }
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: effectiveRole,
      teacherProfileId: user.teacherProfile?.id,
      studentProfileId: user.studentProfile?.id,
      parentProfileId: user.parentProfile?.id,
      secretariatProfileId: user.secretariatProfile?.id,
    };
  }
}
