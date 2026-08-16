import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanQrDto {
  @ApiProperty({
    description: 'Scanned cryptographic opaque student QR code token',
    example: 'qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f',
  })
  @IsString()
  @IsNotEmpty({ message: 'QR Code token is required' })
  qrCodeToken: string;
}
