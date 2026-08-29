import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParentAccessDto {
  @ApiProperty({
    description: 'Phone number or code of a student or parent',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'يرجى إدخال رقم الهاتف أو كود الطالب' })
  studentPhone: string;

  @ApiPropertyOptional({
    description: 'Password for secure direct parent access',
    example: 'r54dpf',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
