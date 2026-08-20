import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanQrDto {
  @ApiProperty({
    description: 'Scanned cryptographic opaque student QR code token or student code',
    example: 'qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f',
  })
  @IsString()
  @IsNotEmpty({ message: 'QR Code token is required' })
  qrCodeToken: string;

  @ApiProperty({
    description: 'Flag to permit cross-group attendance within the same grade level (make-up session)',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowCrossGroup?: boolean;
}

