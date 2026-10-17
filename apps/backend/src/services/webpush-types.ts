import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class PushSubscriptionKeysDto {
  @IsOptional()
  @IsString()
  p256dh?: string;

  @IsOptional()
  @IsString()
  auth?: string;
}

export class PushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys?: PushSubscriptionKeysDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SubscriptionDeliveryOutcome {
  endpoint: string;
  userId?: string;
  status: 'SENT' | 'FAILED' | 'EXPIRED';
  statusCode?: number;
  error?: string;
}

export interface WebPushBatchResult {
  totalSubscriptions: number;
  successCount: number;
  failureCount: number;
  expiredCount: number;
  successfulUserIds: string[];
  failedUserIds: string[];
  partialUserIds: string[];
  deviceOutcomes: SubscriptionDeliveryOutcome[];
}

export interface SendBatchOptions {
  concurrencyLimit?: number;
}
