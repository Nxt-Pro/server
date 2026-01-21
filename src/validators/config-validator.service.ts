/* eslint-disable */

import { Injectable, Logger } from '@nestjs/common';
import * as Yup from 'yup';

@Injectable()
export class ConfigValidatorService {
  private readonly logger = new Logger(ConfigValidatorService.name);
  private errors: string[] = [];
  private readonly config: Record<string, any>;

  constructor() {
    this.config = process.env;
  }

  /**
   * Runs all configuration validations concurrently and collects any errors
   */
  async validateAll(): Promise<boolean> {
    this.errors = [];

    const validations = [
      this.validateEnvironment(),
      this.validateDatabase(),
      this.validateJWT(),
    ];

    const results = await Promise.allSettled(validations);

    results.forEach((result, index) => {
      const type = ['Environment', 'Database', 'JWT'][index];
      if (result.status === 'rejected') {
        this.errors.push(`${type} validation failed: ${result.reason}`);
        this.logger.error(
          `${type} validation failed: ${this.sanitizeErrorMessage(result.reason)}`,
        );
      }
    });

    return this.errors.length === 0;
  }

  /**
   * Validates a config object against the main environment schema for NestJS ConfigModule
   */
  validate(config: Record<string, any>): Record<string, any> {
    try {
      return this.getEnvSchema().validateSync(config, {
        abortEarly: false,
        stripUnknown: true,
      });
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
   * Runs a Yup schema validation against the current config and logs results
   */
  private async runSchemaValidation(
    schema: Yup.ObjectSchema<any>,
    type: string,
  ) {
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
  private getEnvSchema(): Yup.ObjectSchema<any> {
    return Yup.object({
      NODE_ENV: Yup.string()
        .oneOf(['development', 'production', 'test'])
        .default('development'),

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
    });
  }

  /**
   * Sanitizes error messages by redacting sensitive values like passwords or JWT secrets
   */
  private sanitizeErrorMessage(message: string): string {
    return message.replace(
      /(JWT_SECRET|DB_PASSWORD|DB_USERNAME|JWT_REFRESH_SECRET):\s*[^,]*/gi,
      '$1: [REDACTED]',
    );
  }
}
