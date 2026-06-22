import type { RedisOptions } from 'ioredis';

export type RedisProvider = 'local' | 'upstash';

export interface RedisConfig {
  provider: RedisProvider;
  url?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
}

const getRedisProvider = (): RedisProvider =>
  process.env.REDIS_PROVIDER?.trim().toLowerCase() === 'upstash'
    ? 'upstash'
    : 'local';

export const redisConfig = (db = 0): RedisConfig => {
  const provider = getRedisProvider();
  const redisUrl = process.env.REDIS_URL?.trim();

  if (provider === 'upstash') {
    if (!redisUrl) {
      throw new Error('REDIS_URL is required when REDIS_PROVIDER=upstash');
    }

    const parsedUrl = new URL(redisUrl);
    const urlDb = parsedUrl.pathname.replace('/', '');

    return {
      provider,
      url: redisUrl,
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
      username: parsedUrl.username
        ? decodeURIComponent(parsedUrl.username)
        : undefined,
      password: parsedUrl.password
        ? decodeURIComponent(parsedUrl.password)
        : undefined,
      db: urlDb ? parseInt(urlDb, 10) : 0,
      tls: parsedUrl.protocol === 'rediss:' || process.env.REDIS_TLS === 'true',
    };
  }

  return {
    provider,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db,
    tls: process.env.REDIS_TLS === 'true',
  };
};

export const createRedisConnectionOptions = (
  redis: RedisConfig,
  overrides: RedisOptions = {},
): RedisOptions => ({
  host: redis.host,
  port: redis.port,
  username: redis.username,
  password: redis.password,
  db: redis.db,
  tls: redis.tls ? {} : undefined,
  ...overrides,
});
