import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export class VerifyStudentRegistrationDto {
  @ApiProperty({ example: 'STU-2026-0001', description: 'School-issued student code' })
  @IsString()
  @IsNotEmpty({ message: 'Student code is required' })
  @Matches(/^[A-Za-z0-9-]{3,50}$/, { message: 'Student code format is invalid' })
  studentCode: string;

  @ApiProperty({ example: 'A7K2-9M4P-QX', description: 'One-time activation code issued by the school' })
  @IsString()
  @IsNotEmpty({ message: 'Registration code is required' })
  @Matches(/^[A-Za-z0-9\s-]{6,20}$/, { message: 'Registration code format is invalid' })
  registrationCode: string;
}

export class RegisterStudentAccountDto {
  @ApiProperty({ description: 'Short-lived signed token returned by the verification step' })
  @IsString()
  @IsNotEmpty({ message: 'Registration token is required' })
  registrationToken: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @IsEgyptianPhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'student@elawal.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email format is invalid' })
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: 'Password123!', minLength: 6, maxLength: 72 })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  password: string;
}

export class StudentVerificationResponseDto {
  @ApiProperty({ description: 'Short-lived JWT authorizing the account creation step' })
  registrationToken: string;

  @ApiProperty({ example: 'STU-2026-0001' })
  studentCode: string;

  @ApiProperty({ example: 'محمود أحمد علي' })
  fullName: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  gradeLevel: string;
}
