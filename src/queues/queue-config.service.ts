import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueOptions, WorkerOptions } from 'bullmq';

import type { QueueConfig } from '@/config';

@Injectable()
export class QueueConfigService {
  private readonly queueConfig: QueueConfig;

  constructor(configService: ConfigService) {
    this.queueConfig = configService.getOrThrow<QueueConfig>('queue');
  }

  getRedisConnection(): {
    host: string;
    port: number;
    password?: string;
    db: number;
    tls?: object;
    maxRetriesPerRequest: null;
    enableReadyCheck: boolean;
    // eslint-disable-next-line no-unused-vars
    retryStrategy: (times: number) => number;
  } {
    return this.redisConnection;
  }

  private get redisConnection() {
    const { redis } = this.queueConfig;

    return {
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      tls: redis.tls ? {} : undefined,

      maxRetriesPerRequest: null,
      enableReadyCheck: false,

      retryStrategy: (attempt: number) => Math.min(attempt * 50, 2000),
    };
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
