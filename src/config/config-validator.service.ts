import { Injectable, Logger } from '@nestjs/common';
import * as Yup from 'yup';
import {
  databaseSchema,
  environmentSchema,
  jwtSchema,
  queueSchema,
} from './schemas';

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

    const validations = [
      this.validateEnvironment(),
      this.validateDatabase(),
      this.validateJWT(),
      this.validateQueue(),
      // this.validateCache(),
    ];

    const results = await Promise.allSettled(validations);

    results.forEach((result, index) => {
      const type = ['Environment', 'Database', 'JWT', 'Queue'][index];
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
      return this.getEnvSchema().validateSync(config, {
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
    await this.runSchemaValidation(environmentSchema, 'Environment variables');
  }

  /**
   * Validates database-related environment variables
   */
  private async validateDatabase(): Promise<void> {
    await this.runSchemaValidation(databaseSchema, 'Database configuration');
  }

  /**
   * Validates JWT-related environment variables
   */
  private async validateJWT(): Promise<void> {
    await this.runSchemaValidation(jwtSchema, 'JWT configuration');
  }

  /**
   * Validates queue-related environment variables
   */
  private async validateQueue(): Promise<void> {
    await this.runSchemaValidation(queueSchema, 'Queue configuration');
  }

  // private async validateCache(): Promise<void> {
  //   await this.runSchemaValidation(cacheSchema, 'Cache configuration');
  // }

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
  private getEnvSchema(): Yup.AnyObjectSchema {
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
