import { Injectable, Logger } from '@nestjs/common';
import * as Yup from 'yup';
import {
  aiSchema,
  databaseSchema,
  environmentSchema,
  jwtSchema,
  queueSchema,
  uploadSchema,
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
      { name: 'Environment', validate: this.validateEnvironment() },
      { name: 'Database', validate: this.validateDatabase() },
      { name: 'JWT', validate: this.validateJWT() },
      { name: 'Queue', validate: this.validateQueue() },
      { name: 'AI', validate: this.validateAI() },
      { name: 'Upload', validate: this.validateUpload() },
      // { name: 'Cache', validate: this.validateCache() },
    ];

    const results = await Promise.allSettled(validations.map(v => v.validate));

    results.forEach((result, index) => {
      const type = validations[index].name;
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

  /**
   * Validates AI-related environment variables
   */
  private async validateAI(): Promise<void> {
    await this.runSchemaValidation(aiSchema, 'AI configuration');
  }

  /**
   * Validates upload/CDN-related environment variables
   */
  private async validateUpload(): Promise<void> {
    await this.runSchemaValidation(uploadSchema, 'Upload configuration');
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
   * Returns the main Yup schema used by NestJS ConfigModule validation.
   * Composed from the same individual schemas used by validateAll().
   */
  private getEnvSchema(): Yup.AnyObjectSchema {
    return environmentSchema
      .concat(databaseSchema)
      .concat(jwtSchema)
      .concat(aiSchema)
      .concat(uploadSchema);
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
