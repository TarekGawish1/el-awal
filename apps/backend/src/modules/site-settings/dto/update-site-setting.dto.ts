import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateSiteSettingDto {
  @ApiProperty({ example: 'certificates.visibleYears', description: 'Setting key' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: ['2026'], description: 'Allowed values (e.g. academic years visible on the landing page)' })
  @IsArray()
  @IsString({ each: true })
  value: string[];
}
