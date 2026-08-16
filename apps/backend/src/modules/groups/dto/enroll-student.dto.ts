import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollStudentDto {
  @ApiProperty({
    description: 'Target student ID (UUIDv4/v7)',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId: string;
}
