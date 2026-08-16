import { ApiProperty } from '@nestjs/swagger';

export class StudentQrCodeResponseDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' })
  studentId: string;

  @ApiProperty({ example: 'STU-2026-0001' })
  studentCode: string;

  @ApiProperty({ example: 'محمود أحمد علي' })
  fullName: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  gradeLevel: string;

  @ApiProperty({
    description: 'Cryptographic high-entropy opaque token for roll-call badge',
    example: 'qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f',
  })
  qrCodeToken: string;
}
