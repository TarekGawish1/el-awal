import { IsIn, IsNotEmpty, IsString, MinLength, MaxLength, ValidateIf, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export const ACADEMIC_STAGES = ['PRIMARY', 'MIDDLE', 'SECONDARY'];
export const ATTENDANCE_MODES = ['CENTER', 'ONLINE'];

export class RegisterStudentDto {
  @ApiProperty({ example: 'محمود أحمد علي', minLength: 3, maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(3, { message: 'Full name must be at least 3 characters' })
  @MaxLength(200, { message: 'Full name must not exceed 200 characters' })
  fullName: string;

  @ApiProperty({ example: '01012345678', description: 'Student mobile number (verified as unique)' })
  @IsString()
  @IsNotEmpty({ message: 'Student phone is required' })
  @IsEgyptianPhone({ message: 'Student phone must be a valid Egyptian mobile number' })
  studentPhone: string;

  @ApiProperty({ example: '01098765432', description: 'Parent/guardian mobile number', required: false })
  @ValidateIf(o => o.attendanceMode === 'CENTER')
  @IsString()
  @IsNotEmpty({ message: 'Parent phone is required' })
  @IsEgyptianPhone({ message: 'Parent phone must be a valid Egyptian mobile number' })
  parentPhone?: string;

  @ApiProperty({ example: 'SECONDARY', enum: ACADEMIC_STAGES })
  @IsIn(ACADEMIC_STAGES, { message: 'Academic stage must be one of PRIMARY, MIDDLE, SECONDARY' })
  academicStage: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  @MaxLength(50, { message: 'Grade level must not exceed 50 characters' })
  gradeLevel: string;

  @ApiProperty({ example: 'CENTER', enum: ATTENDANCE_MODES })
  @IsIn(ATTENDANCE_MODES, { message: 'Attendance mode must be one of CENTER, ONLINE' })
  attendanceMode: string;

  @ApiProperty({ example: 'abc123-group-uuid', description: 'Optional group ID when registering via a group invite link', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;
}

export class StudentRegistrationCredentialsDto {
  @ApiProperty({ example: 'STU-2026-00482' })
  studentCode: string;

  @ApiProperty({ example: '01012345678' })
  studentPhone: string;

  @ApiProperty({ description: 'Temporary student password, shown only once' })
  studentPassword: string;

  @ApiProperty({ example: '01098765432', required: false })
  @IsOptional()
  parentPhone?: string;

  @ApiProperty({ description: 'Temporary parent password, shown only once (null if parent reused an existing account)', required: false })
  @IsOptional()
  parentPassword?: string | null;

  @ApiProperty({ description: 'True when a brand-new parent account was created', required: false })
  @IsOptional()
  parentIsNew?: boolean;
}
