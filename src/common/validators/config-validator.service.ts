import { Injectable, Logger } from '@nestjs/common';
import * as Yup from 'yup';

@Injectable()
export class ConfigValidatorService {
  private readonly logger = new Logger(ConfigValidatorService.name);
  private errors: string[] = [];
  private readonly config: NodeJS.ProcessEnv;

  constructor() {
    this.config = process.env;
  }

  /**
   * Runs all configuration validations concurrently and collects any errors
   */
  async validateAll(): Promise<boolean> {
    this.errors = [];

    const strictExternalValidation = this.isExternalValidationStrict();

    const validations = [
      this.validateEnvironment(),
      this.validateDatabase(),
      this.validateJWT(),
    ];

    if (strictExternalValidation) {
      validations.push(
        this.validateApp(),
        this.validateMail(),
        this.validateOAuth(),
      );
    } else {
      this.logger.warn(
        'External integration validation is relaxed for development. Set STRICT_EXTERNAL_CONFIG_VALIDATION=true to re-enable strict checks.',
      );
    }

    const results = await Promise.allSettled(validations);

    results.forEach((result, index) => {
      const type = strictExternalValidation
        ? ['Environment', 'Database', 'JWT', 'App', 'Mail', 'OAuth'][index]
        : ['Environment', 'Database', 'JWT'][index];
      if (result.status === 'rejected') {
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        this.errors.push(`${type} validation failed: ${reason}`);
        this.logger.error(
          `${type} validation failed: ${this.sanitizeErrorMessage(reason)}`,
        );
      }
    });

    return this.errors.length === 0;
  }

  /**
   * Validates a config object against the main environment schema for NestJS ConfigModule
   */
  validate(config: Record<string, unknown>): Record<string, unknown> {
    try {
      return this.getEnvSchema(config).validateSync(config, {
        abortEarly: false,
        stripUnknown: true,
      }) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        throw new Error(`Config validation failed: ${error.errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Returns the errors collected during the last validation run
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Validates core environment variables
   */
  private async validateEnvironment(): Promise<void> {
    const schema = Yup.object({
      NODE_ENV: Yup.string()
        .required('NODE_ENV is required')
        .oneOf(['development', 'production', 'test']),
      PORT: Yup.number()
        .transform((_, original) => Number(original))
        .required('PORT is required')
        .min(1024)
        .max(65535),
    });

    await this.runSchemaValidation(schema, 'Environment variables');
  }

  /**
   * Validates database-related environment variables
   */
  private async validateDatabase(): Promise<void> {
    const schema = Yup.object({
      DB_HOST: Yup.string().required('DB_HOST is required'),
      DB_PORT: Yup.number()
        .transform((_, original) => Number(original))
        .required('DB_PORT is required'),
      DB_USERNAME: Yup.string().required('DB_USERNAME is required'),
      DB_PASSWORD: Yup.string().required('DB_PASSWORD is required'),
      DB_NAME: Yup.string().required('DB_NAME is required'),
    });

    await this.runSchemaValidation(schema, 'Database configuration');
  }

  /**
   * Validates JWT-related environment variables
   */
  private async validateJWT(): Promise<void> {
    const schema = Yup.object({
      JWT_SECRET: Yup.string()
        .required('JWT_SECRET is required')
        .min(32)
        .notOneOf(
          ['your_jwt_secret', 'secret', 'password'],
          'JWT_SECRET is too weak',
        ),
      JWT_EXPIRES_IN: Yup.string().default('7d'),
      JWT_REFRESH_SECRET: Yup.string()
        .required('JWT_REFRESH_SECRET is required')
        .min(32),
      JWT_REFRESH_EXPIRES_IN: Yup.string().default('30d'),
    });

    await this.runSchemaValidation(schema, 'JWT configuration');
  }

  /**
   * Validates app-related environment variables
   */
  private async validateApp(): Promise<void> {
    const schema = Yup.object({
      FRONTEND_BASE_URL: Yup.string()
        .required('FRONTEND_BASE_URL is required')
        .url('FRONTEND_BASE_URL must be a valid URL'),
    });

    await this.runSchemaValidation(schema, 'App configuration');
  }

  /**
   * Validates mail-related environment variables
   */
  private async validateMail(): Promise<void> {
    const schema = Yup.object({
      MAIL_HOST: Yup.string().required('MAIL_HOST is required'),
      MAIL_PORT: Yup.number()
        .transform((_, original) => Number(original))
        .required('MAIL_PORT is required')
        .min(1)
        .max(65535),
      MAIL_USER: Yup.string().required('MAIL_USER is required'),
      MAIL_PASSWORD: Yup.string().required('MAIL_PASSWORD is required'),
      MAIL_SECURE: Yup.string()
        .required('MAIL_SECURE is required')
        .oneOf(['true', 'false'], 'MAIL_SECURE must be true or false'),
      MAIL_FROM: Yup.string().required('MAIL_FROM is required'),
    });

    await this.runSchemaValidation(schema, 'Mail configuration');
  }

  /**
   * Validates OAuth-related environment variables
   */
  private async validateOAuth(): Promise<void> {
    const schema = Yup.object({
      GOOGLE_OAUTH_CLIENT_IDS: Yup.string().required(
        'GOOGLE_OAUTH_CLIENT_IDS is required',
      ),
      GOOGLE_OAUTH_WEB_CLIENT_ID: Yup.string().required(
        'GOOGLE_OAUTH_WEB_CLIENT_ID is required',
      ),
      GOOGLE_OAUTH_ANDROID_CLIENT_ID: Yup.string().required(
        'GOOGLE_OAUTH_ANDROID_CLIENT_ID is required',
      ),
      GOOGLE_OAUTH_IOS_CLIENT_ID: Yup.string().required(
        'GOOGLE_OAUTH_IOS_CLIENT_ID is required',
      ),
      GOOGLE_OAUTH_EXPO_CLIENT_ID: Yup.string().required(
        'GOOGLE_OAUTH_EXPO_CLIENT_ID is required',
      ),
      FACEBOOK_APP_ID: Yup.string().required('FACEBOOK_APP_ID is required'),
      FACEBOOK_APP_SECRET: Yup.string().required(
        'FACEBOOK_APP_SECRET is required',
      ),
    });

    await this.runSchemaValidation(schema, 'OAuth configuration');
  }

  /**
   * Runs a Yup schema validation against the current config and logs results
   */
  private async runSchemaValidation(schema: Yup.AnyObjectSchema, type: string) {
    try {
      await schema.validate(this.config, { abortEarly: false });
      this.logger.log(`${type} validated`);
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        throw new Error(error.errors.join(', '));
      }
      throw error;
    }
  }

  /**
   * Returns the main Yup schema used by NestJS ConfigModule validation
   */
  private getEnvSchema(config: Record<string, unknown>): Yup.AnyObjectSchema {
    const strictExternalValidation = this.isExternalValidationStrict(config);
    const optionalString = Yup.string().transform(
      (value: string | undefined, originalValue: unknown) =>
        originalValue === '' ? undefined : value,
    );
    const optionalPort = Yup.number()
      .transform((_, originalValue) => {
        if (originalValue === '' || originalValue === undefined) {
          return undefined;
        }
        return Number(originalValue);
      })
      .min(1)
      .max(65535);

    return Yup.object({
      NODE_ENV: Yup.string()
        .oneOf(['development', 'production', 'test'])
        .default('development'),

      STRICT_EXTERNAL_CONFIG_VALIDATION: Yup.string()
        .oneOf(['true', 'false'])
        .default('false'),

      PORT: Yup.number()
        .transform((_, original) => Number(original))
        .min(1024)
        .max(65535)
        .default(3000),

      // Database
      DB_HOST: Yup.string().required(),
      DB_PORT: Yup.number()
        .transform((_, original) => Number(original))
        .default(5432),
      DB_USERNAME: Yup.string().required(),
      DB_PASSWORD: Yup.string().required(),
      DB_NAME: Yup.string().required(),

      // JWT
      JWT_SECRET: Yup.string().required().min(32),
      JWT_EXPIRES_IN: Yup.string().default('7d'),
      JWT_REFRESH_SECRET: Yup.string().required().min(32),
      JWT_REFRESH_EXPIRES_IN: Yup.string().default('30d'),

      // App
      FRONTEND_BASE_URL: strictExternalValidation
        ? Yup.string().required().url()
        : optionalString.url(),

      // Mail
      MAIL_HOST: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      MAIL_PORT: strictExternalValidation
        ? Yup.number()
            .transform((_, original) => Number(original))
            .required()
            .min(1)
            .max(65535)
        : optionalPort,
      MAIL_USER: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      MAIL_PASSWORD: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      MAIL_SECURE: strictExternalValidation
        ? Yup.string().required().oneOf(['true', 'false'])
        : optionalString.oneOf(['true', 'false']),
      MAIL_FROM: strictExternalValidation
        ? Yup.string().required()
        : optionalString,

      // OAuth
      GOOGLE_OAUTH_CLIENT_IDS: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      GOOGLE_OAUTH_WEB_CLIENT_ID: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      GOOGLE_OAUTH_ANDROID_CLIENT_ID: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      GOOGLE_OAUTH_IOS_CLIENT_ID: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      GOOGLE_OAUTH_EXPO_CLIENT_ID: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      FACEBOOK_APP_ID: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
      FACEBOOK_APP_SECRET: strictExternalValidation
        ? Yup.string().required()
        : optionalString,
    });
  }

  /**
   * External integration values are required in production or when explicitly enabled
   */
  private isExternalValidationStrict(
    config: Record<string, unknown> = this.config,
  ): boolean {
    const strictFlag =
      this.normalizeConfigValue(
        config.STRICT_EXTERNAL_CONFIG_VALIDATION,
      ).toLowerCase() === 'true';
    const nodeEnv = this.normalizeConfigValue(
      config.NODE_ENV,
      'development',
    ).toLowerCase();
    return strictFlag || nodeEnv === 'production';
  }

  /**
   * Converts env values to strings without triggering object stringification lint errors.
   */
  private normalizeConfigValue(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  /**
   * Sanitizes error messages by redacting sensitive values like passwords or JWT secrets
   */
  private sanitizeErrorMessage(message: string): string {
    return message.replace(
      /(JWT_SECRET|DB_PASSWORD|DB_USERNAME|JWT_REFRESH_SECRET|MAIL_PASSWORD|FACEBOOK_APP_SECRET):\s*[^,]*/gi,
      '$1: [REDACTED]',
    );
  }
}
