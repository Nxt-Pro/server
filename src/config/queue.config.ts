import * as dotenv from 'dotenv';

import { RedisConfig, redisConfig } from './redis.config';

dotenv.config({ quiet: true });

export interface QueueConfig {
  redis: RedisConfig;
  concurrency: number;
  maxRetries: number;
  limiter: {
    max: number;
    duration: number;
  };
}

export const queueConfig = (): QueueConfig => ({
  redis: redisConfig(parseInt(process.env.REDIS_DB_QUEUE || '0', 10)),

  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),

  limiter: {
    max: parseInt(process.env.QUEUE_LIMITER_MAX || '10', 10),
    duration: parseInt(process.env.QUEUE_LIMITER_DURATION || '1000', 10),
  },
});
