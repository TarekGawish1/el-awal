import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

import { isEgyptianPhone } from '../utils/phone.util';

export function IsEgyptianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEgyptianPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid Egyptian mobile phone number (Vodafone, Orange, Etisalat, or WE)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return isEgyptianPhone(value);
        },
      },
    });
  };
}
