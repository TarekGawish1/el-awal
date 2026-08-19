import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address or registered phone number',
    example: 'teacher@elawal.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier (email or phone) is required' })
  identifier: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
