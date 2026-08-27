import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address, registered phone number, or student code',
    example: 'STU-2026-00048 or 01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier (phone or student code) is required' })
  identifier: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
