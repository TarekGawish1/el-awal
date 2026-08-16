import { IsOptional, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

export class PaymentQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by student UUID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by physical group UUID' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Filter by billing year', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2050)
  periodYear?: number;

  @ApiPropertyOptional({ description: 'Filter by billing month (1-12)', example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by payment status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
