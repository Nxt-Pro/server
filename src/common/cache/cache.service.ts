import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { CacheConfig, createRedisConnectionOptions } from '@/config';

type CacheHit<T> = { hit: true; value: T };
type CacheMiss = { hit: false };

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly cacheConfig: CacheConfig;
  private readonly redis: Redis;
  private unavailableUntil = 0;

  constructor(private readonly configService: ConfigService) {
    this.cacheConfig = this.configService.getOrThrow<CacheConfig>('cache');
    this.redis = new Redis(
      createRedisConnectionOptions(this.cacheConfig.redis, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
      }),
    );

    this.redis.on('error', error => {
      this.logger.warn(`Cache Redis error: ${error.message}`);
    });
  }

  getDefaultTtlSeconds(): number {
    return this.cacheConfig.ttlSeconds;
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached.hit) {
      return cached.value;
    }

    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const redis = await this.getRedisClient();
    if (!redis) return;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          '100',
        );
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      this.markUnavailable(error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') {
      await this.redis.quit().catch(() => undefined);
    }
  }

  private async get<T>(key: string): Promise<CacheHit<T> | CacheMiss> {
    const redis = await this.getRedisClient();
    if (!redis) return { hit: false };

    try {
      const raw = await redis.get(key);
      if (raw === null) return { hit: false };

      try {
        return { hit: true, value: JSON.parse(raw) as T };
      } catch {
        this.logger.warn(`Deleting invalid cache payload for key ${key}`);
        await redis.del(key).catch(() => undefined);
        return { hit: false };
      }
    } catch (error) {
      this.markUnavailable(error);
      return { hit: false };
    }
  }

  private async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    const redis = await this.getRedisClient();
    if (!redis) return;

    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.markUnavailable(error);
    }
  }

  private async getRedisClient(): Promise<Redis | null> {
    if (Date.now() < this.unavailableUntil) {
      return null;
    }

    try {
      if (this.redis.status === 'wait' || this.redis.status === 'close') {
        await this.redis.connect();
      }

      return this.redis.status === 'ready' ? this.redis : null;
    } catch (error) {
      this.markUnavailable(error);
      return null;
    }
  }

  private markUnavailable(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.unavailableUntil = Date.now() + 30000;
    this.logger.warn(`Cache unavailable; bypassing for 30s: ${message}`);
  }
}
