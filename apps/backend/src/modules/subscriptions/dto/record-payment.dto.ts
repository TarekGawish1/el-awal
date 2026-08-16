import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Target student ID (UUID)',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId: string;

  @ApiPropertyOptional({
    description: 'Physical academic group ID (Optional if general tuition)',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty({
    description: 'Billing year (2020 - 2050)',
    example: 2026,
    minimum: 2020,
    maximum: 2050,
  })
  @IsInt()
  @Min(2020)
  @Max(2050)
  periodYear: number;

  @ApiProperty({
    description: 'Billing month (1 - 12)',
    example: 9,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @ApiProperty({
    description: 'Amount paid in EGP',
    example: 450.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({
    description: 'Expected fee amount (Defaults to group monthlyFee if not provided)',
    example: 450.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountExpected?: number;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    default: PaymentStatus.PAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment channel (e.g. CASH, VODAFONE_CASH, INSTAPAY, FAWRY)',
    example: 'CASH',
    default: 'CASH',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Official printed receipt or transaction reference number',
    example: 'REC-2026-09-0012',
  })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: 'Payment remarks or special discount notes',
    example: 'تم سداد المصروفات نقداً في المركز',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
