import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Matches Egyptian mobile phone formats:
// 010xxxxxxxx, 011xxxxxxxx, 012xxxxxxxx, 015xxxxxxxx, +2010xxxxxxxx, +2011xxxxxxxx, +2012xxxxxxxx, +2015xxxxxxxx
const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

export function IsEgyptianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEgyptianPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid Egyptian mobile phone number (e.g. 01012345678 or +201012345678)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'string' && EGYPTIAN_PHONE_REGEX.test(value.trim());
        },
      },
    });
  };
}
