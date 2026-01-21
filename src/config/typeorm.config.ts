/* eslint-disable */

import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { SnakeNamingStrategy } from '@/database';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<TypeOrmModuleOptions> => {
    const dbConfig = configService.get('database');
    const isProduction = configService.get('nodeEnv') === 'production';

    return {
      // Connection
      type: dbConfig.type,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,

      // Connection pooling
      extra: {
        max: dbConfig.poolSize,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      },

      migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],

      autoLoadEntities: true,
      synchronize: false, // Never synchronize in production

      migrationsRun: false, // Manually run migrations (isProduction for auto running)
      migrationsTableName: 'migrations',

      logging: isProduction ? ['error'] : ['query', 'error', 'warn'],
      logger: 'advanced-console',
      maxQueryExecutionTime: dbConfig.maxQueryExecutionTime,

      // Naming strategy
      namingStrategy: new SnakeNamingStrategy(),
    };
  },
};
