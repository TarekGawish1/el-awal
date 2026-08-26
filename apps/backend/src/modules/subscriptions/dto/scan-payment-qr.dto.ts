import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanPaymentQrDto {
  @ApiProperty({
    description: 'QR Code token scanned from the student badge',
    example: 'qr_tok_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty({ message: 'رمز الـ QR مطلوب' })
  qrCodeToken: string;

  @ApiPropertyOptional({
    description: 'Target academic group ID (optional; defaults to the student active group)',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    enum: ['TUITION', 'BOOKLET', 'OTHER'],
    description: 'Type of payment (TUITION, BOOKLET, OTHER)',
    default: 'TUITION',
    example: 'BOOKLET',
  })
  @IsOptional()
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER';

  @ApiPropertyOptional({
    description: 'Booklet ID if payment is for a study booklet/notes (UUID)',
    example: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  })
  @IsOptional()
  @IsUUID()
  bookletId?: string;

  @ApiPropertyOptional({
    description: 'Billing year (defaults to current year)',
    example: 2026,
  })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2050)
  periodYear?: number;

  @ApiPropertyOptional({
    description: 'Billing month (defaults to current month)',
    example: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({
    description: 'Amount paid in EGP (defaults to group monthly fee)',
    example: 450.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Payment method (e.g. CASH, QR_SCAN, INSTAPAY)',
    default: 'CASH',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Receipt number',
  })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: 'Notes or remarks',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
