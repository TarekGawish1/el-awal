import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetStudentPasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'Optional custom new password. If omitted, a clean secure PIN/password will be generated.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  newPassword?: string;

  @ApiProperty({
    example: true,
    description: 'Whether to instantly send WhatsApp notification with new credentials to parent and student.',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendWhatsApp?: boolean;
}
