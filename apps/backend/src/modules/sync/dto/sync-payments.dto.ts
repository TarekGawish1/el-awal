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
  @ApiPropertyOptional({ description: 'Client-generated UUIDv7 operation ID for idempotency' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'Client temp ID for payment item' })
  @IsString()
  @IsOptional()
  clientTempId?: string;

  @ApiProperty({ description: 'Student profile UUID' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: 'Academic group UUID' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Billing period year (e.g. 2026)' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  periodYear?: number;

  @ApiPropertyOptional({ description: 'Alternative field for billing period year' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  billingPeriodYear?: number;

  @ApiPropertyOptional({ description: 'Billing period month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  periodMonth?: number;

  @ApiPropertyOptional({ description: 'Alternative field for billing period month' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  billingPeriodMonth?: number;

  @ApiPropertyOptional({ description: 'Amount paid by student' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @ApiPropertyOptional({ description: 'Amount paid by student (alias)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Expected tuition amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountExpected?: number;

  @ApiPropertyOptional({ default: 'CASH' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

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

  @ApiPropertyOptional({ description: 'Collected at timestamp' })
  @IsOptional()
  collectedAt?: string | Date;

  @ApiPropertyOptional({ description: 'Client timestamp in epoch ms' })
  @IsNumber()
  @IsOptional()
  clientTimestamp?: number;
}

export class SyncPaymentsBatchDto {
  @ApiProperty({ type: [SyncPaymentItemDto], description: 'Array of offline payment operations to reconcile' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPaymentItemDto)
  operations: SyncPaymentItemDto[];
}
