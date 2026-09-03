import { IsNotEmpty, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollStudentDto {
  @ApiProperty({
    description: 'Target student ID (UUIDv4/v7)',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId: string;

  @ApiPropertyOptional({
    description:
      'When true, moves the student out of any other active group into this one. When false/omitted, enrolling a student who is already active in another group is rejected.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  transfer?: boolean;
}
