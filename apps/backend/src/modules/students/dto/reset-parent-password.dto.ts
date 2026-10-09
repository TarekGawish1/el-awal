import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetParentPasswordDto {
  @ApiProperty({
    example: 'p4k8m2',
    description: 'Optional custom new password for parent. If omitted, a clean random password will be generated.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  newPassword?: string;

  @ApiProperty({
    example: true,
    description: 'Whether to instantly send WhatsApp notification with new credentials to the parent.',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendWhatsApp?: boolean;
}
