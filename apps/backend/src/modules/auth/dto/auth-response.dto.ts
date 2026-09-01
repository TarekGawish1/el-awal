import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'أحمد محمود' })
  fullName: string;

  @ApiPropertyOptional({ example: 'teacher@elawal.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+201012345678' })
  phone?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TEACHER })
  role: UserRole;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  teacherProfileId?: string;

  @ApiPropertyOptional({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' })
  studentProfileId?: string;

  @ApiPropertyOptional({ example: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f' })
  parentProfileId?: string;

  @ApiPropertyOptional({ example: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a' })
  secretariatProfileId?: string;

  @ApiPropertyOptional({ example: ['MANAGE_STUDENTS', 'MANAGE_ATTENDANCE'] })
  permissions?: string[];
}

export class AuthTokensResponseDto {
  @ApiProperty({ description: 'Short-lived JWT Access Token' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived JWT Refresh Token' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access token expiration in seconds', example: 900 })
  expiresIn: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
