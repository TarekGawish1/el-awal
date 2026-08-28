import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { StudentRegistrationService } from '../services/student-registration.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { RegisterStudentDto } from '../dto/student-registration.dto';
import { RegisterByGroupDto } from '../dto/register-by-group.dto';
import { Public } from '../../../core/security/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly studentRegistrationService: StudentRegistrationService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with phone or email credentials and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, returns tokens and user object', type: AuthTokensResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account is inactive' })
  async login(@Body() dto: LoginDto): Promise<AuthTokensResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('parent-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate as the linked parent using a registered student phone number' })
  @ApiResponse({ status: 200, description: 'Parent authentication successful, returns tokens and parent user object', type: AuthTokensResponseDto })
  @ApiResponse({ status: 401, description: 'Student phone is not registered or has no active linked parent' })
  async parentAccess(@Body() dto: ParentAccessDto): Promise<AuthTokensResponseDto> {
    return this.authService.parentAccess(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('student-registration/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-service student registration: creates the student account, the parent account, the parent-student link, and returns one-time credentials' })
  @ApiResponse({ status: 201, description: 'Student and parent accounts created; student auto-authenticated', type: AuthTokensResponseDto })
  @ApiResponse({ status: 409, description: 'Phone number already registered, or student/parent phones conflict' })
  async registerStudent(@Body() dto: RegisterStudentDto) {
    return this.studentRegistrationService.registerStudent(dto);
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
  async registerByGroup(@Body() dto: RegisterByGroupDto): Promise<AuthTokensResponseDto> {
    return this.authService.registerByGroup(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using long-lived refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token session on client logout' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
