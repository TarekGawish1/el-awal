import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Payload for the password-gated academic period switch.
 * The password is re-verified server-side before the active year/term is changed.
 */
export class SwitchAcademicPeriodDto {
  @ApiProperty({
    description: 'Academic year to activate across the platform',
    example: '2026-2027',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  academicYear: string;

  @ApiProperty({
    description: 'Academic term/semester to activate',
    enum: ['FIRST_TERM', 'SECOND_TERM'],
    example: 'FIRST_TERM',
  })
  @IsIn(['FIRST_TERM', 'SECOND_TERM'])
  academicTerm: string;

  @ApiProperty({
    description: 'Account password, re-verified before applying the switch',
    example: 'MyS3cret!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
