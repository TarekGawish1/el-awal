import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelPaymentDto {
  @ApiPropertyOptional({
    description: 'Reason for refunding or cancelling the payment',
    example: 'الطالب طلب استرداد المبلغ وإلغاء الاشتراك',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
