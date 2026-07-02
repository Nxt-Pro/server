import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';
import { Public } from '@/common/decorators';

@Public()
@Controller('health')
export class HealthController {
  private readonly healthService: HealthService;
  private readonly health: HealthCheckService;
  private readonly db: TypeOrmHealthIndicator;
  private readonly memory: MemoryHealthIndicator;
  constructor(
    healthService: HealthService,
    health: HealthCheckService,
    db: TypeOrmHealthIndicator,
    memory: MemoryHealthIndicator,
  ) {
    this.healthService = healthService;
    this.health = health;
    this.db = db;
    this.memory = memory;
  }
  @Get()
  getHealthStatus() {
    return this.healthService.getBasicHealth();
  }
  @Get('detailed')
  getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'healthy') {
      response.status(503);
    }
    return readiness;
  }
  @Get('database')
  @HealthCheck()
  async getDatabaseHealth() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
  @Get('memory')
  getMemoryHealth() {
    return this.healthService.getMemoryUsage();
  }
  @Get('system')
  getSystemInfo() {
    return this.healthService.getSystemInfo();
  }
  @Get('all')
  @HealthCheck()
  async checkAll() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024), // 500MB
    ]);
  }
}
