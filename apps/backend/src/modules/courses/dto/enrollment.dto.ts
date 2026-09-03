import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class EnrollStudentsBatchDto {
  @ApiProperty({ description: 'List of student UUIDs to enroll in the course', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds: string[];
}

export class CreateAndEnrollStudentDto {
  @ApiProperty({ description: 'Student full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Student phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Parent phone number' })
  @IsString()
  @IsNotEmpty()
  parentPhone: string;

  @ApiProperty({ description: 'Student grade level (e.g. الصف الثالث الثانوي)' })
  @IsString()
  @IsNotEmpty()
  gradeLevel: string;

  @ApiPropertyOptional({ description: 'Academic stage' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({ description: 'Optional group ID to assign student to' })
  @IsOptional()
  @IsString()
  groupId?: string;
}

export class EnrollByQrDto {
  @ApiProperty({ description: 'Scanned student QR code payload or token' })
  @IsString()
  @IsNotEmpty()
  qrToken: string;
}

export class CourseSubscriptionRequestDto {
  @ApiPropertyOptional({ description: 'Sender Vodafone Cash wallet phone number' })
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiPropertyOptional({ description: 'Amount transferred' })
  @IsOptional()
  transferAmount?: number;

  @ApiPropertyOptional({ description: 'Cloudflare R2 receipt screenshot image URL' })
  @IsOptional()
  @IsString()
  receiptImageUrl?: string;

  @ApiPropertyOptional({ description: 'Payment method (default: VODAFONE_CASH)' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class RejectSubscriptionRequestDto {
  @ApiPropertyOptional({ description: 'Reason for rejecting course subscription request' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
