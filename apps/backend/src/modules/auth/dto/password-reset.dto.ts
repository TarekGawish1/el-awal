import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Registered Egyptian WhatsApp phone number',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({
    description: 'Cryptographic password reset token from WhatsApp link',
    example: 'a4f9c8...',
  })
  @IsString()
  @IsNotEmpty({ message: 'رمز استعادة كلمة المرور مطلوب' })
  token: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'NewSecret123!',
  })
  @IsString()
  @MinLength(6, { message: 'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام' })
  newPassword: string;
}
