import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export class CreateStudentDto {
  @ApiProperty({ example: 'محمود أحمد علي', minLength: 3 })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(3, { message: 'Full name must be at least 3 characters' })
  fullName: string;

  @ApiPropertyOptional({ example: '+201012345678' })
  @IsOptional()
  @IsEgyptianPhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'mahmoud@student.elawal.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: 'Password123!',
    minLength: 6,
    description: 'Omit to leave the student pending self-registration (an activation code is issued instead)',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  gradeLevel: string;

  @ApiPropertyOptional({ example: 'المرحلة الثانوية' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({ example: '2008-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '+201198765432' })
  @IsOptional()
  @IsEgyptianPhone()
  emergencyPhone?: string;

  // Optional Guardian Information
  @ApiPropertyOptional({ example: 'أحمد علي إبراهيم' })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiPropertyOptional({ example: '+201098765432' })
  @IsOptional()
  @IsEgyptianPhone()
  parentPhone?: string;

  @ApiPropertyOptional({ example: 'Father' })
  @IsOptional()
  @IsString()
  parentRelationship?: string;

  // Optional Initial Physical Group Enrollment
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  @IsOptional()
  @IsUUID()
  initialGroupId?: string;
}
