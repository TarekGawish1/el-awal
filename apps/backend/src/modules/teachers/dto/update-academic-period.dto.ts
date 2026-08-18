import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAcademicPeriodDto {
  @ApiProperty({
    description: 'Active academic year for the teacher',
    example: '2025-2026',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  activeAcademicYear: string;

  @ApiProperty({
    description: 'Active academic term/semester (FIRST_TERM or SECOND_TERM)',
    example: 'FIRST_TERM',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  activeAcademicTerm: string;
}
