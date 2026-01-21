import * as os from 'os';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

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
}
