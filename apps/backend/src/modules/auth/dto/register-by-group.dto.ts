import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEgyptianPhone } from '../../../common/decorators/is-egyptian-phone.decorator';

export class RegisterByGroupDto {
  @ApiProperty({ example: 'clx1a2b3c4d5e6f7g8h9', description: 'Group registration invite token' })
  @IsString()
  @IsNotEmpty({ message: 'رمز الدعوة مطلوب' })
  @MaxLength(64, { message: 'رمز الدعوة غير صالح' })
  token: string;

  @ApiProperty({ example: 'محمود أحمد علي', minLength: 3, maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'اسم الطالب مطلوب' })
  @MinLength(3, { message: 'اسم الطالب يجب أن يكون 3 أحرف على الأقل' })
  @MaxLength(200, { message: 'اسم الطالب يجب ألا يتجاوز 200 حرف' })
  fullName: string;

  @ApiProperty({ example: '01012345678', description: 'Student mobile number (verified as unique)' })
  @IsString()
  @IsNotEmpty({ message: 'رقم هاتف الطالب مطلوب' })
  @IsEgyptianPhone({ message: 'رقم هاتف الطالب يجب أن يكون رقم موبايل مصري صحيح' })
  phone: string;

  @ApiProperty({ example: 'محمد أحمد علي', maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'اسم ولي الأمر مطلوب' })
  @MaxLength(200, { message: 'اسم ولي الأمر يجب ألا يتجاوز 200 حرف' })
  parentName: string;

  @ApiProperty({ example: '01098765432', description: 'Parent/guardian mobile number' })
  @IsString()
  @IsNotEmpty({ message: 'رقم هاتف ولي الأمر مطلوب' })
  @IsEgyptianPhone({ message: 'رقم هاتف ولي الأمر يجب أن يكون رقم موبايل مصري صحيح' })
  parentPhone: string;

  @ApiProperty({ example: 'Str0ngPass!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @MaxLength(72, { message: 'كلمة المرور يجب ألا تتجاوز 72 حرفاً' })
  password: string;
}
