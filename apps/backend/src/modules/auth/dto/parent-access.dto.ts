import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export class ParentAccessDto {
  @ApiProperty({
    description: 'Phone number of a student already registered by the administration',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'يرجى إدخال رقم هاتف الطالب' })
  @IsEgyptianPhone({ message: 'يرجى إدخال رقم هاتف مصري صحيح للطالب' })
  studentPhone: string;
}
