import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({
    description: 'Teacher display name',
    example: 'أ. أحمد غريب',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Teacher mobile number (Egyptian format)',
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  @IsEgyptianPhone()
  phone?: string;
}
