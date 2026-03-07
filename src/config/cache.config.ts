import { RedisConfig, redisConfig } from './redis.config';

export interface CacheConfig {
  redis: RedisConfig;
  ttlSeconds: number;
}

export const cacheConfig = (): CacheConfig => ({
  redis: redisConfig(parseInt(process.env.REDIS_DB_CACHE || '1', 10)),
  ttlSeconds: parseInt(process.env.CACHE_TTL || '300', 10),
});
