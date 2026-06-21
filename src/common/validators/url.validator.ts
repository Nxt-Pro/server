import { registerDecorator, ValidationOptions } from 'class-validator';
import * as Yup from 'yup';

export interface UrlValidatorOptions {
  protocols?: string[];
}

const DEFAULT_PROTOCOLS = ['http:', 'https:'];

export function isUrl(
  value: unknown,
  options: UrlValidatorOptions = {},
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    const protocols = options.protocols ?? DEFAULT_PROTOCOLS;

    return Boolean(url.hostname) && protocols.includes(url.protocol);
  } catch {
    return false;
  }
}

export function yupUrl<T extends Yup.StringSchema>(
  schema: T,
  message: string,
  options?: UrlValidatorOptions,
): T {
  return schema.test('is-url', message, value => {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    return isUrl(value, options);
  });
}

/**
 * A custom class-validator decorator that checks whether a string is a valid URL.
 * It accepts localhost URLs such as http://localhost:3000 for local development.
 */
export function IsUrl(validationOptions?: ValidationOptions): PropertyDecorator;
export function IsUrl(
  validatorOptions?: UrlValidatorOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator;
export function IsUrl(
  firstOptions?: UrlValidatorOptions | ValidationOptions,
  secondOptions?: ValidationOptions,
): PropertyDecorator {
  const hasValidatorOptions =
    secondOptions !== undefined || 'protocols' in (firstOptions ?? {});
  const validatorOptions = hasValidatorOptions
    ? (firstOptions as UrlValidatorOptions)
    : undefined;
  const validationOptions =
    secondOptions ??
    (validatorOptions ? undefined : (firstOptions as ValidationOptions));

  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isUrl',
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isUrl(value, validatorOptions);
        },
        defaultMessage() {
          return '$property must be a valid URL';
        },
      },
    });
  };
}
