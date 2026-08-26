import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantGroupAccessDto {
  @ApiProperty({
    description: 'List of AcademicGroup IDs to grant course access to',
    example: ['d933cc98-532e-4940-a1b6-ba121ff5a697'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  groupIds: string[];
}
