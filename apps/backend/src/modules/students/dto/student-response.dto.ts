import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentAcademicStatus } from '@prisma/client';

export class StudentProfileResponseDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  userId: string;

  @ApiProperty({ example: 'محمود أحمد علي' })
  fullName: string;

  @ApiPropertyOptional({ example: '+201012345678' })
  phone?: string;

  @ApiPropertyOptional({ example: 'mahmoud@student.elawal.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'STU-2026-0001' })
  studentCode?: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  gradeLevel: string;

  @ApiPropertyOptional({ example: 'المرحلة الثانوية' })
  academicStage?: string;

  @ApiProperty({ enum: StudentAcademicStatus, example: StudentAcademicStatus.ACTIVE })
  academicStatus: StudentAcademicStatus;

  @ApiPropertyOptional({ example: '2008-05-15' })
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: '+201198765432' })
  emergencyPhone?: string;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  createdAt: Date;
}
