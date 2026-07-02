import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from '@/database';

dotenv.config({ quiet: true });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  migrations: [join(__dirname, '../database/migrations/*.{ts,js}')],
  entities: [join(__dirname, '../database/entities/**/*.entity.{ts,js}')],

  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
});
