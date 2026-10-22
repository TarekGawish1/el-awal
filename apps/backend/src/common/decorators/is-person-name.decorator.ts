import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidPersonName, CONTAINS_DIGITS_REGEX } from '../utils/name.util';

export function IsPersonName(validationOptions?: ValidationOptions & { minLength?: number }) {
  const minLength = validationOptions?.minLength ?? 3;
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPersonName',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: (args: ValidationArguments) => {
          const val = args.value;
          if (typeof val === 'string' && CONTAINS_DIGITS_REGEX.test(val)) {
            return `${args.property} must not contain numbers (الاسم يجب ألا يحتوي على أي أرقام)`;
          }
          return `${args.property} must be a valid person name containing only letters (يجب إدخال اسم صحيح يتكون من حروف فقط)`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) return true;
          return isValidPersonName(value, minLength);
        },
      },
    });
  };
}
