import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateVisibilityDto {
  @ApiProperty({ example: true, description: 'إظهار الشهادة في صفحة الموقع (true) أو إخفاؤها (false)' })
  @IsBoolean()
  isPublic: boolean;
}
