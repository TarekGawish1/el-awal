import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillingConfigurationDto {
  @ApiProperty({ example: '2026-2027' })
  @IsString()
  academicYear: string;

  @ApiProperty({ example: 'FIRST_TERM', enum: ['FIRST_TERM', 'SECOND_TERM'] })
  @IsIn(['FIRST_TERM', 'SECOND_TERM'])
  academicTerm: string;

  @ApiProperty({ example: [8, 9], type: [Number] })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  excludedMonths: number[];

  @ApiPropertyOptional({ example: 'PREPAID', enum: ['PREPAID', 'POSTPAID'] })
  @IsOptional()
  @IsIn(['PREPAID', 'POSTPAID'])
  paymentTiming?: 'PREPAID' | 'POSTPAID';
}
