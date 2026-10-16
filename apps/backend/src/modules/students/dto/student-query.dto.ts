import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  IsOptional,
  IsString,
  IsEnum,
  isUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentAcademicStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

export function IsUUIDOrUnassigned(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDOrUnassigned',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid UUID or UNASSIGNED`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === 'UNASSIGNED') {
            return true;
          }
          return typeof value === 'string' && isUUID(value, 'all');
        },
      },
    });
  };
}

export class StudentQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Text search matching student name, phone or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by grade level', example: 'الصف الثالث الثانوي' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by academic stage', example: 'المرحلة الثانوية' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrolled physical group ID (UUID) or UNASSIGNED',
    example: 'UNASSIGNED',
  })
  @IsOptional()
  @IsString()
  @IsUUIDOrUnassigned()
  groupId?: string;

  @ApiPropertyOptional({ enum: StudentAcademicStatus, description: 'Filter by academic status' })
  @IsOptional()
  @IsEnum(StudentAcademicStatus)
  academicStatus?: StudentAcademicStatus;
}
