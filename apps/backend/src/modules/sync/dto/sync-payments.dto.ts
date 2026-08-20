import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class SyncPaymentItemDto {
  @ApiProperty({ description: 'Client-generated UUIDv7 operation ID for idempotency' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Student profile UUID' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: 'Academic group UUID' })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiProperty({ description: 'Billing period year (e.g. 2026)' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear: number;

  @ApiProperty({ description: 'Billing period month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @ApiProperty({ description: 'Amount paid by student' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Expected tuition amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountExpected?: number;

  @ApiProperty({ default: 'CASH' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ default: 'EGP' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PAID })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Receipt number or voucher ID' })
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @ApiPropertyOptional({ description: 'Optional payment notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Client timestamp in epoch ms' })
  @IsNumber()
  clientTimestamp: number;
}

export class SyncPaymentsBatchDto {
  @ApiProperty({ type: [SyncPaymentItemDto], description: 'Array of offline payment operations to reconcile' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPaymentItemDto)
  operations: SyncPaymentItemDto[];
}
