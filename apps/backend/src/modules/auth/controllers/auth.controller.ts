import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { StudentRegistrationService } from '../services/student-registration.service';
import { AuthVerificationService } from '../services/auth-verification.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SwitchRoleDto } from '../dto/switch-role.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { RegisterStudentDto } from '../dto/student-registration.dto';
import { RegisterByGroupDto } from '../dto/register-by-group.dto';
import { RequestOtpDto, VerifyOtpDto } from '../dto/otp.dto';
import { RequestPasswordResetDto, ConfirmPasswordResetDto } from '../dto/password-reset.dto';
import { Public } from '../../../core/security/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly studentRegistrationService: StudentRegistrationService,
    private readonly authVerificationService: AuthVerificationService,
  ) {}

  /**
   * Sets the long-lived refresh token in an HttpOnly, Secure cookie.
   * Uses sameSite: 'none' in production to allow cross-site requests (al-awal.online -> herokuapp.com).
   * Sets domain: '.al-awal.online' when accessed via the platform domain to ensure session sharing across subdomains.
   * Adds partitioned: true (CHIPS) to comply with modern Chrome, Brave, and Safari partitioned cookie requirements.
   */
  private setRefreshTokenCookie(res: any, refreshToken: string, req?: any) {
    if (!res) return;
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const host = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || req?.hostname || '').toString();
    const origin = (req?.headers?.origin || req?.headers?.referer || '').toString();
    const isAlAwalHost = host.includes('al-awal.online') || origin.includes('al-awal.online');

    const cookieOptions: any = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      maxAge,
      partitioned: isProd,
    };

    if (isProd && isAlAwalHost) {
      cookieOptions.domain = '.al-awal.online';
    }

    if (typeof res.setCookie === 'function') {
      // Fastify reply
      res.setCookie('refreshToken', refreshToken, cookieOptions);
    } else if (typeof res.cookie === 'function') {
      // Express response
      res.cookie('refreshToken', refreshToken, cookieOptions);
    }
  }

  /**
   * Clears the HttpOnly refresh token cookie on user logout.
   */
  private clearRefreshTokenCookie(res: any, req?: any) {
    if (!res) return;
    const isProd = process.env.NODE_ENV === 'production';
    const host = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || req?.hostname || '').toString();
    const origin = (req?.headers?.origin || req?.headers?.referer || '').toString();
    const isAlAwalHost = host.includes('al-awal.online') || origin.includes('al-awal.online');

    const clearOptions: any = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      partitioned: isProd,
    };

    if (isProd && isAlAwalHost) {
      clearOptions.domain = '.al-awal.online';
    }

    if (typeof res.clearCookie === 'function') {
      res.clearCookie('refreshToken', clearOptions);
    }
  }

  @Public()
  @Throttle({ default: { limit: 180, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with phone or email credentials and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns tokens and user object', type: AuthTokensResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account is inactive' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.login(dto);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a 6-digit WhatsApp OTP for passwordless login' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully via WhatsApp' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authVerificationService.requestLoginOtp(dto.phone, dto.role);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit WhatsApp OTP and authenticate user' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully, returns tokens and user object', type: AuthTokensResponseDto })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const user = await this.authVerificationService.verifyLoginOtp(dto.phone, dto.code, dto.role);
    const targetRole = (dto.role as UserRole) || (user.role as UserRole);
    const result = await this.authService.issueTokens(user as any, targetRole);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a secure password reset link dispatched via WhatsApp' })
  @ApiResponse({ status: 200, description: 'Password reset link dispatched via WhatsApp' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authVerificationService.requestPasswordReset(dto.phone, dto.role);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset with cryptographic token and update password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authVerificationService.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 180, ttl: 60000 } })
  @Post('parent-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate as the linked parent using a registered student phone number' })
  @ApiResponse({ status: 200, description: 'Parent authentication successful, returns tokens and parent user object', type: AuthTokensResponseDto })
  @ApiResponse({ status: 401, description: 'Student phone is not registered or has no active linked parent' })
  async parentAccess(
    @Body() dto: ParentAccessDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.parentAccess(dto);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('student-registration/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-service student registration: creates the student account, the parent account, the parent-student link, and returns one-time credentials' })
  @ApiResponse({ status: 201, description: 'Student and parent accounts created; student auto-authenticated', type: AuthTokensResponseDto })
  @ApiResponse({ status: 409, description: 'Phone number already registered, or student/parent phones conflict' })
  async registerStudent(
    @Body() dto: RegisterStudentDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ) {
    const result = await this.studentRegistrationService.registerStudent(dto);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('group-invite/:token')
  @ApiOperation({ summary: 'Public group invite metadata validation for the self-registration view' })
  @ApiResponse({ status: 200, description: 'Group invite metadata with validity flag' })
  async getGroupInvite(@Param('token') token: string) {
    return this.authService.getGroupInvite(token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register-by-group')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-registration via group invite link: creates the student account, links/creates the parent, enrolls the student into the group, and returns auth tokens' })
  @ApiResponse({ status: 201, description: 'Student registered, enrolled and auto-authenticated', type: AuthTokensResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid invite token or registration closed' })
  @ApiResponse({ status: 409, description: 'Phone number already registered, or student/parent phones conflict' })
  async registerByGroup(
    @Body() dto: RegisterByGroupDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.registerByGroup(dto);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('switch-role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active role for a multi-profile user. Requires valid access token.' })
  @ApiResponse({ status: 200, description: 'Role switched successfully, returns new tokens and user object', type: AuthTokensResponseDto })
  @ApiResponse({ status: 400, description: 'User does not have the required profile for the target role' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async switchRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchRoleDto,
    @Res({ passthrough: true }) res: any,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.authService.switchRole(user.id, dto.targetRole);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using long-lived refresh token from HttpOnly cookie or request body' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: any,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = (req.cookies as any)?.['refreshToken'] || dto?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const result = await this.authService.refreshToken({ refreshToken: token });
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken, req);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token session and clear HttpOnly cookie on client logout' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @Req() req: any,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = (req.cookies as any)?.['refreshToken'] || dto?.refreshToken;
    this.clearRefreshTokenCookie(res, req);
    if (token) {
      return this.authService.logout({ refreshToken: token });
    }
    return { success: true, message: 'Logged out successfully' };
  }
}
