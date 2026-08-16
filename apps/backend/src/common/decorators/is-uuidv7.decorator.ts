import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Matches standard 36-char hyphenated UUID string (v4 or v7)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function IsUUIDv7(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDv7',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid UUID format`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'string' && UUID_REGEX.test(value);
        },
      },
    });
  };
}
