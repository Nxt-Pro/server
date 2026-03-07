import { registerDecorator, ValidationOptions } from 'class-validator';

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * A custom class-validator decorator that checks whether a string is a valid 26-character ULID
 */
export function IsUlid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUlid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && ULID_REGEX.test(value);
        },
        defaultMessage() {
          return '$property must be a valid ULID';
        },
      },
    });
  };
}
