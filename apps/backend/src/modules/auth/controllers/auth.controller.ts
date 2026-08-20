import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { StudentRegistrationService } from '../services/student-registration.service';
import { LoginDto } from '../dto/login.dto';
import { ParentAccessDto } from '../dto/parent-access.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { VerifyStudentRegistrationDto, RegisterStudentAccountDto } from '../dto/student-registration.dto';
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
  @Post('student-registration/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an existing student record using the student code and the one-time school-issued activation code' })
  @ApiResponse({ status: 200, description: 'Verification successful, returns a short-lived registration token' })
  @ApiResponse({ status: 401, description: 'Verification data does not match a pending student record' })
  @ApiResponse({ status: 409, description: 'Student account is already registered' })
  async verifyStudentRegistration(@Body() dto: VerifyStudentRegistrationDto) {
    return this.studentRegistrationService.verifyStudent(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('student-registration/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Claim a verified pending student account by setting login credentials (role is always STUDENT)' })
  @ApiResponse({ status: 201, description: 'Account created and linked to the existing student record, returns tokens', type: AuthTokensResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired registration token' })
  @ApiResponse({ status: 409, description: 'Student already registered or identifier already in use' })
  async registerStudentAccount(@Body() dto: RegisterStudentAccountDto): Promise<AuthTokensResponseDto> {
    return this.studentRegistrationService.registerStudentAccount(dto);
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
