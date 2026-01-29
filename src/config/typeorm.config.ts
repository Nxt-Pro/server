import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { DatabaseLogger, SnakeNamingStrategy } from '@/database';

interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
  maxQueryExecutionTime: number;
  ssl: boolean | { rejectUnauthorized: boolean };
}

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
    const dbConfig = configService.get<DatabaseConfig>('database');
    if (!dbConfig) {
      throw new Error('Database configuration is missing');
    }
    const isProduction = configService.get<string>('nodeEnv') === 'production';

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

      entities: [__dirname + '/../database/entities/**/*{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: false, // Never synchronize in production

      migrationsRun: isProduction,
      migrationsTableName: 'migrations',

      logging: isProduction ? ['error'] : ['query', 'error', 'warn'],
      logger: new DatabaseLogger(),
      maxQueryExecutionTime: dbConfig.maxQueryExecutionTime,

      // Naming strategy
      namingStrategy: new SnakeNamingStrategy(),
    };
  },
};
