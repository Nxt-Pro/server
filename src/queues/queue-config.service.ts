import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueOptions, WorkerOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

import { createRedisConnectionOptions, type QueueConfig } from '@/config';

@Injectable()
export class QueueConfigService {
  private readonly queueConfig: QueueConfig;

  constructor(configService: ConfigService) {
    this.queueConfig = configService.getOrThrow<QueueConfig>('queue');
  }

  getRedisConnection(): RedisOptions {
    return this.redisConnection;
  }

  private get redisConnection(): RedisOptions {
    const { redis } = this.queueConfig;

    return createRedisConnectionOptions(redis, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (attempt: number) => Math.min(attempt * 50, 2000),
    });
  }

  getQueueConfig(queueName: string): QueueOptions {
    const { maxRetries } = this.queueConfig;

    return {
      connection: this.redisConnection,

      defaultJobOptions: {
        attempts: maxRetries,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
          count: 200,
        },
      },

      prefix: `nxtpro:${queueName}`,
    };
  }

  getWorkerConfig(): WorkerOptions {
    const { concurrency, limiter } = this.queueConfig;

    return {
      connection: this.redisConnection,
      concurrency,
      limiter,
      stalledInterval: 30_000,
      maxStalledCount: 2,
    };
  }
}
