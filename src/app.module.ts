import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import {
  HttpExceptionFilter,
  TypeOrmExceptionFilter,
  ValidationExceptionFilter,
} from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { DatabaseModule } from './database/database.module';
import { configuration, ConfigValidatorService } from '@/config';
import { DatabaseService } from '@/database';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [
    // Configuration (loads all env vars + validates)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: process.env.NODE_ENV === 'production',
      validate: config => {
        const validator = new ConfigValidatorService();
        return validator.validate(config);
      },
    }),

    // Database
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Feature modules
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    DatabaseService,
    ConfigValidatorService,

    // Filters
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('AppModule initialized');
  }
}
