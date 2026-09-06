import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class SwitchRoleDto {
  @ApiProperty({
    description: 'Target role to switch to',
    enum: UserRole,
    example: UserRole.PARENT,
  })
  @IsEnum(UserRole, { message: 'الدور المطلوب غير صالح' })
  @IsNotEmpty({ message: 'يجب تحديد الدور المطلوب' })
  targetRole: UserRole;
}
