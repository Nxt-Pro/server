import * as os from 'os';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DatabaseService } from '@/database/database.service';
import { createRedisConnectionOptions, type QueueConfig } from '@/config';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private readonly configService: ConfigService;
  private readonly databaseService: DatabaseService;
  private redis: Redis | null = null;

  constructor(configService: ConfigService, databaseService: DatabaseService) {
    this.configService = configService;
    this.databaseService = databaseService;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis && this.redis.status !== 'end') {
      await this.redis.quit().catch(() => undefined);
    }
  }

  getBasicHealth() {
    const uptime = Date.now() - this.startTime;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      environment: this.configService.get<string>('nodeEnv'),
    };
  }

  async getDetailedHealth() {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const dbStatus = await this.checkDatabaseConnection();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      environment: this.configService.get<string>('nodeEnv'),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: memoryUsage,
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? os.loadavg() : [0, 0, 0],
      },
      database: dbStatus,
    };
  }

  async getReadiness() {
    const uptime = Date.now() - this.startTime;
    const [database, redis] = await Promise.all([
      this.checkDatabaseConnection(),
      this.checkRedisConnection(),
    ]);
    const healthy =
      database.status === 'connected' &&
      (redis.status === 'connected' || redis.status === 'skipped');

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      environment: this.configService.get<string>('nodeEnv'),
      dependencies: {
        database,
        redis,
      },
    };
  }

  async checkDatabaseConnection() {
    const startTime = performance.now();

    try {
      const isConnected = await this.databaseService.checkConnection();
      const responseTime = performance.now() - startTime;

      return {
        status: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        responseTime: responseTime,
        message: isConnected
          ? 'Database connection is healthy'
          : 'Database connection failed',
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTime: responseTime,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  async checkRedisConnection() {
    const startTime = performance.now();
    const queuesDisabled =
      this.configService.get<string>('nodeEnv') === 'test' ||
      process.env.NXTPRO_DISABLE_QUEUES === 'true';

    if (queuesDisabled) {
      return {
        status: 'skipped',
        timestamp: new Date().toISOString(),
        responseTime: 0,
        message:
          'Redis readiness skipped because queue infrastructure is disabled',
      };
    }

    try {
      const redis = this.getRedisClient();
      if (redis.status === 'wait' || redis.status === 'close') {
        await redis.connect();
      }

      const pong = await redis.ping();
      const responseTime = performance.now() - startTime;

      return {
        status: pong === 'PONG' ? 'connected' : 'error',
        timestamp: new Date().toISOString(),
        responseTime,
        message:
          pong === 'PONG'
            ? 'Redis connection is healthy'
            : 'Redis ping returned an unexpected response',
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Redis readiness check failed: ${message}`);
      this.redis?.disconnect();
      this.redis = null;

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTime,
        message,
      };
    }
  }

  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      rss: {
        bytes: memoryUsage.rss,
        formatted: this.formatBytes(memoryUsage.rss),
      },
      heapTotal: {
        bytes: memoryUsage.heapTotal,
        formatted: this.formatBytes(memoryUsage.heapTotal),
      },
      heapUsed: {
        bytes: memoryUsage.heapUsed,
        formatted: this.formatBytes(memoryUsage.heapUsed),
      },
      external: {
        bytes: memoryUsage.external,
        formatted: this.formatBytes(memoryUsage.external),
      },
      arrayBuffers: {
        bytes: memoryUsage.arrayBuffers,
        formatted: this.formatBytes(memoryUsage.arrayBuffers),
      },
    };
  }

  getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      environment: this.configService.get<string>('nodeEnv') ?? 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      hostname: os.hostname(),
      totalMemory: {
        bytes: os.totalmem(),
        formatted: this.formatBytes(os.totalmem()),
      },
      freeMemory: {
        bytes: os.freemem(),
        formatted: this.formatBytes(os.freemem()),
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? os.loadavg() : [0, 0, 0],
        cores: os.cpus().length,
      },
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private getRedisClient(): Redis {
    if (this.redis && this.redis.status !== 'end') {
      return this.redis;
    }

    const queueConfig = this.configService.getOrThrow<QueueConfig>('queue');
    this.redis = new Redis(
      createRedisConnectionOptions(queueConfig.redis, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        retryStrategy: () => null,
      }),
    );
    this.redis.on('error', () => undefined);

    return this.redis;
  }
}
