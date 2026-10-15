import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({
    description: 'Registered Egyptian WhatsApp phone number or student identifier',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;

  @ApiPropertyOptional({
    description: 'Target role for authentication context (e.g. PARENT)',
    example: 'PARENT',
  })
  @IsOptional()
  @IsString()
  role?: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Registered Egyptian WhatsApp phone number or student identifier',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;

  @ApiProperty({
    description: '6-digit OTP code sent via WhatsApp',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'رمز التحقق يجب أن يتكون من 6 أرقام' })
  @Matches(/^[0-9]{6}$/, { message: 'رمز التحقق يجب أن يحتوي على أرقام فقط' })
  code: string;

  @ApiPropertyOptional({
    description: 'Target role for authentication context (e.g. PARENT)',
    example: 'PARENT',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
