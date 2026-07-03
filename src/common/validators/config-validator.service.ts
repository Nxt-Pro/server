import { Injectable, Logger } from '@nestjs/common';
import * as Yup from 'yup';

import {
  aiSchema,
  cacheSchema,
  databaseSchema,
  environmentSchema,
  jwtSchema,
  queueSchema,
  uploadSchema,
} from '@/config/schemas';
import { yupUrl } from '@/common/validators/url.validator';

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

    const validations: Array<{ type: string; task: Promise<void> }> = [
      { type: 'Environment', task: this.validateEnvironment() },
      { type: 'Database', task: this.validateDatabase() },
      { type: 'JWT', task: this.validateJWT() },
      { type: 'Queue', task: this.validateQueue() },
      { type: 'Cache', task: this.validateCache() },
      { type: 'Upload', task: this.validateUpload() },
      { type: 'AI', task: this.validateAi() },
    ];

    if (strictExternalValidation) {
      validations.push(
        { type: 'App', task: this.validateApp() },
        { type: 'Mail', task: this.validateMail() },
        { type: 'OAuth', task: this.validateOAuth() },
      );

      if (this.getBooleanConfig('PUSH_NOTIFICATIONS_ENABLED')) {
        validations.push({ type: 'Firebase', task: this.validateFirebase() });
      }
    } else {
      this.logger.warn(
        'External integration validation is relaxed for development. Set STRICT_EXTERNAL_CONFIG_VALIDATION=true to re-enable strict checks.',
      );
    }

    const results = await Promise.allSettled(
      validations.map(validation => validation.task),
    );

    results.forEach((result, index) => {
      const type = validations[index]?.type ?? 'Unknown';
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
    const schema = environmentSchema.shape({
      CORS_ORIGIN: this.isProductionLike()
        ? yupUrl(
            Yup.string().required('CORS_ORIGIN is required in production'),
            'CORS_ORIGIN must be a valid URL in production',
          ).notOneOf(['*'], 'CORS_ORIGIN cannot be * in production')
        : Yup.string().default('*'),
    });

    await this.runSchemaValidation(schema, 'Environment variables');
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
   * Validates queue Redis and BullMQ configuration
   */
  private async validateQueue(): Promise<void> {
    const redisProvider = this.getRedisProvider();
    const isUpstashProvider = redisProvider === 'upstash';
    const redisPortSchema = Yup.number()
      .transform((_, orig) =>
        orig === undefined || orig === '' ? undefined : Number(orig),
      )
      .min(1)
      .max(65535);
    const redisUrlSchema = Yup.string().test(
      'redis-url-provider',
      'REDIS_URL must be a valid redis:// or rediss:// URL and Upstash must use rediss:// or REDIS_TLS=true',
      value => this.isRedisUrlValid(value, this.config, isUpstashProvider),
    );
    const schema = (
      this.isProductionLike()
        ? queueSchema.shape({
            REDIS_PROVIDER: Yup.string()
              .required('REDIS_PROVIDER is required')
              .oneOf(
                ['local', 'upstash'],
                'REDIS_PROVIDER must be local or upstash',
              ),
            REDIS_URL: isUpstashProvider
              ? redisUrlSchema.required(
                  'REDIS_URL is required when REDIS_PROVIDER=upstash',
                )
              : redisUrlSchema,
            REDIS_HOST: isUpstashProvider
              ? Yup.string()
              : Yup.string().required(
                  'REDIS_HOST is required in production when REDIS_PROVIDER=local',
                ),
            REDIS_PORT: isUpstashProvider
              ? redisPortSchema
              : redisPortSchema.required(
                  'REDIS_PORT is required in production when REDIS_PROVIDER=local',
                ),
            REDIS_PASSWORD: isUpstashProvider
              ? Yup.string()
              : Yup.string().required(
                  'REDIS_PASSWORD is required in production when REDIS_PROVIDER=local',
                ),
            REDIS_TLS: isUpstashProvider
              ? Yup.string().oneOf(
                  ['true', 'false'],
                  'REDIS_TLS must be true or false',
                )
              : Yup.string()
                  .required(
                    'REDIS_TLS is required in production when REDIS_PROVIDER=local',
                  )
                  .oneOf(['true', 'false'], 'REDIS_TLS must be true or false'),
          })
        : queueSchema.shape({
            REDIS_URL: isUpstashProvider
              ? redisUrlSchema.required(
                  'REDIS_URL is required when REDIS_PROVIDER=upstash',
                )
              : redisUrlSchema,
          })
    ) as Yup.AnyObjectSchema;

    await this.runSchemaValidation(schema, 'Queue configuration');
  }

  /**
   * Validates cache Redis configuration
   */
  private async validateCache(): Promise<void> {
    await this.runSchemaValidation(cacheSchema, 'Cache configuration');
  }

  /**
   * Validates upload and public media URL configuration
   */
  private async validateUpload(): Promise<void> {
    const schema = (
      this.isProductionLike()
        ? uploadSchema.shape({
            UPLOAD_PUBLIC_BASE_URL: yupUrl(
              Yup.string().required(
                'UPLOAD_PUBLIC_BASE_URL is required in production',
              ),
              'UPLOAD_PUBLIC_BASE_URL must be a valid URL',
            ).test(
              'not-localhost',
              'UPLOAD_PUBLIC_BASE_URL must not use localhost in production',
              value => Boolean(value && !/localhost|127\.0\.0\.1/.test(value)),
            ),
          })
        : uploadSchema
    ) as Yup.AnyObjectSchema;

    await this.runSchemaValidation(schema, 'Upload configuration');
  }

  /**
   * Validates AI scoring endpoint configuration
   */
  private async validateAi(): Promise<void> {
    const aiScoringEnabled = this.getBooleanConfig('AI_SCORING_ENABLED');
    const useMockAi = this.getBooleanConfig('USE_MOCK_AI');
    const requireServiceUrls =
      this.isProductionLike() && aiScoringEnabled && !useMockAi;
    const schema = (
      requireServiceUrls
        ? aiSchema.shape({
            AI_SKILL_SERVICE_URL: yupUrl(
              Yup.string().required(
                'AI_SKILL_SERVICE_URL is required when AI scoring is enabled and USE_MOCK_AI=false in production-like runtime',
              ),
              'AI_SKILL_SERVICE_URL must be a valid URL',
            ),
            AI_MODERATION_SERVICE_URL: yupUrl(
              Yup.string().required(
                'AI_MODERATION_SERVICE_URL is required when AI scoring is enabled and USE_MOCK_AI=false in production-like runtime',
              ),
              'AI_MODERATION_SERVICE_URL must be a valid URL',
            ),
            AI_RECOMMENDATION_SERVICE_URL: yupUrl(
              Yup.string().required(
                'AI_RECOMMENDATION_SERVICE_URL is required when AI scoring is enabled and USE_MOCK_AI=false in production-like runtime',
              ),
              'AI_RECOMMENDATION_SERVICE_URL must be a valid URL',
            ),
          })
        : aiSchema
    ) as Yup.AnyObjectSchema;

    await this.runSchemaValidation(schema, 'AI configuration');
  }

  /**
   * Validates app-related environment variables
   */
  private async validateApp(): Promise<void> {
    const schema = Yup.object({
      FRONTEND_BASE_URL: yupUrl(
        Yup.string().required('FRONTEND_BASE_URL is required'),
        'FRONTEND_BASE_URL must be a valid URL',
      ),
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
   * Validates Firebase Admin configuration when real push delivery is expected
   */
  private async validateFirebase(): Promise<void> {
    const schema = Yup.object({
      PUSH_NOTIFICATIONS_ENABLED: Yup.string()
        .required('PUSH_NOTIFICATIONS_ENABLED is required')
        .oneOf(
          ['true', 'false'],
          'PUSH_NOTIFICATIONS_ENABLED must be true or false',
        ),
      FIREBASE_PROJECT_ID: Yup.string().required(
        'FIREBASE_PROJECT_ID is required when PUSH_NOTIFICATIONS_ENABLED=true',
      ),
      FIREBASE_CLIENT_EMAIL: Yup.string().required(
        'FIREBASE_CLIENT_EMAIL is required when PUSH_NOTIFICATIONS_ENABLED=true',
      ),
      FIREBASE_PRIVATE_KEY: Yup.string().required(
        'FIREBASE_PRIVATE_KEY is required when PUSH_NOTIFICATIONS_ENABLED=true',
      ),
    });

    await this.runSchemaValidation(schema, 'Firebase configuration');
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
    const isProduction = this.isProductionLike(config);
    const strictExternalValidation = this.isExternalValidationStrict(config);
    const optionalString = Yup.string().transform(
      (value: string | undefined, originalValue: unknown) =>
        originalValue === '' ? undefined : value,
    );
    const optionalUrl = yupUrl(
      optionalString.trim(),
      '${path} must be a valid URL',
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
    const redisProvider = this.getRedisProvider(config);
    const isUpstashProvider = redisProvider === 'upstash';
    const optionalRedisUrl = optionalString.test(
      'redis-url-provider',
      'REDIS_URL must be a valid redis:// or rediss:// URL and Upstash must use rediss:// or REDIS_TLS=true',
      value => this.isRedisUrlValid(value, config, isUpstashProvider),
    );
    const aiScoringEnabled = this.getBooleanConfig(
      'AI_SCORING_ENABLED',
      config,
    );
    const useMockAi = this.getBooleanConfig('USE_MOCK_AI', config);
    const requireAiServiceUrls = isProduction && aiScoringEnabled && !useMockAi;
    const pushNotificationsEnabled = this.getBooleanConfig(
      'PUSH_NOTIFICATIONS_ENABLED',
      config,
    );
    const aiServiceUrl = (name: string) =>
      yupUrl(
        requireAiServiceUrls
          ? Yup.string().required(
              `${name} is required when AI scoring is enabled and USE_MOCK_AI=false in production-like runtime`,
            )
          : optionalString,
        `${name} must be a valid URL`,
      );

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

      CORS_ORIGIN: isProduction
        ? yupUrl(
            Yup.string().required(),
            'CORS_ORIGIN must be a valid URL',
          ).notOneOf(['*'], 'CORS_ORIGIN cannot be * in production')
        : Yup.string().default('*'),

      // Database
      DB_HOST: Yup.string().required(),
      DB_PORT: isProduction
        ? Yup.number()
            .transform((_, originalValue) => {
              if (originalValue === '' || originalValue === undefined) {
                return undefined;
              }
              return Number(originalValue);
            })
            .required()
        : Yup.number()
            .transform((_, originalValue) => {
              if (originalValue === '' || originalValue === undefined) {
                return undefined;
              }
              return Number(originalValue);
            })
            .default(5432),
      DB_USERNAME: Yup.string().required(),
      DB_PASSWORD: Yup.string().required(),
      DB_NAME: Yup.string().required(),
      DB_SSL: isProduction
        ? Yup.string().required().oneOf(['true', 'false'])
        : Yup.string().oneOf(['true', 'false']).default('false'),
      DB_SSL_REJECT_UNAUTHORIZED: Yup.string()
        .oneOf(['true', 'false'])
        .default('false'),
      DB_MIGRATIONS_RUN: Yup.string().oneOf(['true', 'false']).default('false'),
      DB_POOL_SIZE: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(20),
      DB_QUERY_TIMEOUT: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(5000),

      // JWT
      JWT_SECRET: Yup.string().required().min(32),
      JWT_EXPIRES_IN: Yup.string().default('7d'),
      JWT_REFRESH_SECRET: Yup.string().required().min(32),
      JWT_REFRESH_EXPIRES_IN: Yup.string().default('30d'),

      // App
      FRONTEND_BASE_URL: strictExternalValidation
        ? yupUrl(
            Yup.string().required(),
            'FRONTEND_BASE_URL must be a valid URL',
          )
        : yupUrl(optionalString, 'FRONTEND_BASE_URL must be a valid URL'),

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

      PUSH_NOTIFICATIONS_ENABLED: Yup.string()
        .oneOf(['true', 'false'])
        .default('false'),

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

      // Redis, queues, and cache
      REDIS_PROVIDER: Yup.string()
        .oneOf(['local', 'upstash'], 'REDIS_PROVIDER must be local or upstash')
        .default('local'),
      REDIS_URL: isUpstashProvider
        ? optionalRedisUrl.required(
            'REDIS_URL is required when REDIS_PROVIDER=upstash',
          )
        : optionalRedisUrl,
      REDIS_HOST:
        isProduction && !isUpstashProvider
          ? Yup.string().required()
          : Yup.string().default('localhost'),
      REDIS_PORT:
        isProduction && !isUpstashProvider
          ? Yup.number()
              .transform((_, originalValue) => {
                if (originalValue === '' || originalValue === undefined) {
                  return undefined;
                }
                return Number(originalValue);
              })
              .required()
          : Yup.number()
              .transform((_, originalValue) => {
                if (originalValue === '' || originalValue === undefined) {
                  return undefined;
                }
                return Number(originalValue);
              })
              .default(6379),
      REDIS_PASSWORD:
        isProduction && !isUpstashProvider
          ? Yup.string().required()
          : optionalString,
      REDIS_TLS:
        isProduction && !isUpstashProvider
          ? Yup.string().required().oneOf(['true', 'false'])
          : Yup.string().oneOf(['true', 'false']).default('false'),
      REDIS_DB_QUEUE: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(0)
        .default(0),
      REDIS_DB_CACHE: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(0)
        .default(1),
      CACHE_TTL: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(300),
      QUEUE_CONCURRENCY: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(5),
      QUEUE_MAX_RETRIES: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(0)
        .default(3),
      QUEUE_LIMITER_MAX: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(10),
      QUEUE_LIMITER_DURATION: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(1000),

      // Uploads and public media URLs
      UPLOAD_STORAGE_PROVIDER: Yup.string()
        .oneOf(['local', 'cloud'])
        .default('local'),
      UPLOAD_LOCAL_DIR: Yup.string().default('uploads'),
      UPLOAD_PUBLIC_BASE_URL: isProduction
        ? yupUrl(
            Yup.string().required(),
            'UPLOAD_PUBLIC_BASE_URL must be a valid URL',
          ).test(
            'not-localhost',
            'UPLOAD_PUBLIC_BASE_URL must not use localhost in production',
            value => Boolean(value && !/localhost|127\.0\.0\.1/.test(value)),
          )
        : yupUrl(
            Yup.string(),
            'UPLOAD_PUBLIC_BASE_URL must be a valid URL',
          ).default('http://localhost:3000/uploads'),
      CDN_BASE_URL: optionalUrl,
      MAX_VIDEO_SIZE_MB: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .max(5000)
        .default(500),
      MAX_AUDIO_SIZE_MB: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .max(500)
        .default(50),
      ALLOWED_VIDEO_FORMATS: Yup.string().default(
        'mp4,mov,m4v,avi,webm,mkv,3gp',
      ),
      ALLOWED_AUDIO_FORMATS: Yup.string().default(
        'mp3,m4a,aac,wav,ogg,oga,flac,webm',
      ),

      // AI scoring
      AI_SCORING_ENABLED: Yup.string()
        .oneOf(['true', 'false'])
        .default('false'),
      AI_SCORING_QUEUE_ENABLED: Yup.string()
        .oneOf(['true', 'false'])
        .default('true'),
      AI_SKILL_SERVICE_URL: aiServiceUrl('AI_SKILL_SERVICE_URL'),
      AI_MODERATION_SERVICE_URL: aiServiceUrl('AI_MODERATION_SERVICE_URL'),
      AI_RECOMMENDATION_SERVICE_URL: aiServiceUrl(
        'AI_RECOMMENDATION_SERVICE_URL',
      ),
      AI_SERVICE_TIMEOUT_MS: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1000)
        .default(120000),
      AI_SERVICE_RETRY_ATTEMPTS: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1)
        .default(3),
      AI_SCORING_MAX_MEDIA_BYTES: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1_048_576)
        .default(104_857_600),
      USE_MOCK_AI: Yup.string().oneOf(['true', 'false']).default('false'),
      AI_MODEL_API_URL: yupUrl(
        optionalString,
        'AI_MODEL_API_URL must be a valid URL',
      ),
      AI_MODEL_API_KEY: optionalString.min(10),
      AI_MODEL_TIMEOUT_MS: Yup.number()
        .transform((_, originalValue) => {
          if (originalValue === '' || originalValue === undefined) {
            return undefined;
          }
          return Number(originalValue);
        })
        .min(1000)
        .default(120000),

      // Optional push configuration; FirebaseService degrades gracefully if absent.
      FIREBASE_PROJECT_ID:
        strictExternalValidation && pushNotificationsEnabled
          ? Yup.string().required()
          : optionalString,
      FIREBASE_CLIENT_EMAIL:
        strictExternalValidation && pushNotificationsEnabled
          ? Yup.string().required()
          : optionalString,
      FIREBASE_PRIVATE_KEY:
        strictExternalValidation && pushNotificationsEnabled
          ? Yup.string().required()
          : optionalString,

      // Seed-only values. The seed script enforces them in production.
      SUPER_ADMIN_1_USERNAME: optionalString,
      SUPER_ADMIN_1_EMAIL: optionalString.email(),
      SUPER_ADMIN_1_PASSWORD: optionalString,
      SUPER_ADMIN_2_USERNAME: optionalString,
      SUPER_ADMIN_2_EMAIL: optionalString.email(),
      SUPER_ADMIN_2_PASSWORD: optionalString,
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
   * Infrastructure defaults are development-only; production must be explicit.
   */
  private isProductionLike(
    config: Record<string, unknown> = this.config,
  ): boolean {
    const strictFlag =
      this.normalizeConfigValue(
        config.STRICT_EXTERNAL_CONFIG_VALIDATION,
      ).toLowerCase() === 'true';
    return (
      strictFlag ||
      this.normalizeConfigValue(
        config.NODE_ENV,
        'development',
      ).toLowerCase() === 'production'
    );
  }

  /**
   * Returns the selected Redis provider. Local Redis remains the default.
   */
  private getRedisProvider(
    config: Record<string, unknown> = this.config,
  ): 'local' | 'upstash' {
    return this.normalizeConfigValue(config.REDIS_PROVIDER, 'local')
      .trim()
      .toLowerCase() === 'upstash'
      ? 'upstash'
      : 'local';
  }

  private getBooleanConfig(
    name: string,
    config: Record<string, unknown> = this.config,
  ): boolean {
    return this.normalizeConfigValue(config[name]).toLowerCase() === 'true';
  }

  /**
   * Validates Redis TCP URLs and enforces TLS when Upstash is selected.
   */
  private isRedisUrlValid(
    value: string | undefined,
    config: Record<string, unknown>,
    requireTls: boolean,
  ): boolean {
    if (!value) return true;
    if (!value.startsWith('redis://') && !value.startsWith('rediss://')) {
      return false;
    }

    try {
      const parsedUrl = new URL(value);
      const tlsEnabled =
        parsedUrl.protocol === 'rediss:' ||
        this.normalizeConfigValue(config.REDIS_TLS).toLowerCase() === 'true';

      return !requireTls || tlsEnabled;
    } catch {
      return false;
    }
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
      /(JWT_SECRET|DB_PASSWORD|DB_USERNAME|JWT_REFRESH_SECRET|REDIS_URL|REDIS_PASSWORD|MAIL_PASSWORD|AI_MODEL_API_KEY|FIREBASE_PRIVATE_KEY|FACEBOOK_APP_SECRET|SUPER_ADMIN_[12]_PASSWORD):\s*[^,]*/gi,
      '$1: [REDACTED]',
    );
  }
}
