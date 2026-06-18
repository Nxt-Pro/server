export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
  maxQueryExecutionTime: number;
  ssl: boolean | { rejectUnauthorized: boolean };
  migrationsRun: boolean;
}

export const databaseConfig = (): DatabaseConfig => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,

  poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  maxQueryExecutionTime: parseInt(process.env.DB_QUERY_TIMEOUT || '5000', 10),
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',

  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        }
      : false,
});
