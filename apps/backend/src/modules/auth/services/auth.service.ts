import { Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterByGroupDto } from '../dto/register-by-group.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import {
  AuthTokenService,
  type JwtTokenPayload,
  type AuthUserRecord,
} from './auth-token.service';
import { AuthSessionService } from './auth-session.service';
import { AuthCredentialsService } from './auth-credentials.service';
import { AuthGroupRegistrationService } from './auth-group-registration.service';

export type { JwtTokenPayload, AuthUserRecord };

@Injectable()
export class AuthService {
  private readonly tokenService: AuthTokenService;
  private readonly sessionService: AuthSessionService;
  private readonly credentialsService: AuthCredentialsService;
  private readonly groupRegistrationService: AuthGroupRegistrationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Optional() tokenService?: AuthTokenService,
    @Optional() sessionService?: AuthSessionService,
    @Optional() credentialsService?: AuthCredentialsService,
    @Optional() groupRegistrationService?: AuthGroupRegistrationService,
  ) {
    this.tokenService =
      tokenService ?? new AuthTokenService(this.prisma, this.jwtService, this.configService);
    this.sessionService =
      sessionService ?? new AuthSessionService(this.prisma, this.tokenService);
    this.credentialsService =
      credentialsService ??
      new AuthCredentialsService(this.prisma, this.tokenService, this.sessionService);
    this.groupRegistrationService =
      groupRegistrationService ??
      new AuthGroupRegistrationService(this.prisma, this.tokenService, this.notificationsService);
  }

  /**
   * User login and credentials verification
   */
  async login(dto: LoginDto): Promise<AuthTokensResponseDto> {
    return this.credentialsService.login(dto);
  }

  async parentAccess(dto: ParentAccessDto): Promise<AuthTokensResponseDto> {
    return this.credentialsService.parentAccess(dto);
  }

  async hashPassword(password: string): Promise<string> {
    return this.credentialsService.hashPassword(password);
  }

  /**
   * Token issuance, verification, and rotation
   */
  async issueTokens(user: AuthUserRecord, overrideRole?: UserRole): Promise<AuthTokensResponseDto> {
    return this.tokenService.issueTokens(user, overrideRole);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenService.refreshToken(dto);
  }

  async switchRole(userId: string, targetRole: UserRole): Promise<AuthTokensResponseDto> {
    return this.tokenService.switchRole(userId, targetRole);
  }

  /**
   * Session revocation and logout
   */
  async logout(dto: RefreshTokenDto): Promise<{ success: boolean; message: string }> {
    return this.sessionService.logout(dto);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    return this.sessionService.revokeAllUserSessions(userId);
  }

  /**
   * Group invite queries and self-registration
   */
  async getGroupInvite(token: string) {
    return this.groupRegistrationService.getGroupInvite(token);
  }

  async registerByGroup(dto: RegisterByGroupDto): Promise<AuthTokensResponseDto> {
    return this.groupRegistrationService.registerByGroup(dto);
  }

  deriveStageLabel(gradeLevel: string): string {
    return this.groupRegistrationService.deriveStageLabel(gradeLevel);
  }

  deriveStageCode(gradeLevel: string): string | null {
    return this.groupRegistrationService.deriveStageCode(gradeLevel);
  }
}
