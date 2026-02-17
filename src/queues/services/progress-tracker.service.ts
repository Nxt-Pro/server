import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { QueueConfigService } from '../queue-config.service';

import { JobStatus } from '@/common/enums';
import { JobProgress } from '@/common/types';

@Injectable()
export class ProgressTrackerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProgressTrackerService.name);
  private redis!: Redis;
  private readonly TTL = 3600; // 1 hour TTL for progress data

  private readonly queueConfigService: QueueConfigService;

  constructor(queueConfigService: QueueConfigService) {
    this.queueConfigService = queueConfigService;
  }

  onModuleInit(): void {
    const connection = this.queueConfigService.getRedisConnection();
    this.redis = new Redis(connection);
    this.logger.log('Progress tracker Redis connection established');
  }

  /**
   * Initialize job progress tracking
   */
  async initProgress(
    jobId: string,
    type: 'upload' | 'analysis',
    totalSteps: number,
    userId: string,
  ): Promise<void> {
    const progress: JobProgress = {
      jobId,
      type,
      status: JobStatus.QUEUED,
      progress: 0,
      currentStep: 'Initializing...',
      currentStepIndex: 0,
      totalSteps,
      startedAt: new Date(),
    };

    await this.setProgress(jobId, progress, userId);
    await this.addUserJob(userId, jobId);
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    userId: string,
    updates: Partial<JobProgress>,
  ): Promise<void> {
    const current = await this.getProgress(jobId, userId);
    if (!current) {
      throw new Error(`Progress not found for job ${jobId}`);
    }

    const newStepIndex = updates.currentStepIndex ?? current.currentStepIndex;
    const updated: JobProgress = {
      ...current,
      ...updates,
      currentStepIndex: newStepIndex,
      progress: this.calculateProgress(
        newStepIndex,
        current.totalSteps,
        updates.progress,
      ),
    };

    await this.setProgress(jobId, updated, userId);
  }

  /**
   * Mark job as processing
   */
  async markProcessing(
    jobId: string,
    userId: string,
    currentStep: string,
    stepIndex?: number,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.PROCESSING,
      currentStep,
      currentStepIndex: stepIndex,
    });
  }

  /**
   * Mark job as completed
   */
  async markCompleted(
    jobId: string,
    userId: string,
    result?: unknown,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.COMPLETED,
      progress: 100,
      currentStep: 'Completed',
      currentStepIndex: Number.MAX_SAFE_INTEGER,
      completedAt: new Date(),
      result,
    });
    await this.removeUserJob(userId, jobId);
  }

  /**
   * Mark job as failed
   */
  async markFailed(
    jobId: string,
    userId: string,
    error: string,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.FAILED,
      currentStep: 'Failed',
      completedAt: new Date(),
      error,
    });
    await this.removeUserJob(userId, jobId);
  }

  /**
   * Get job progress
   */
  async getProgress(
    jobId: string,
    userId: string,
  ): Promise<JobProgress | null> {
    const data = await this.redis.get(this.getProgressKey(jobId, userId));
    return data ? (JSON.parse(data) as JobProgress) : null;
  }

  /**
   * Get progress for multiple jobs
   */
  async getMultipleProgress(
    jobIds: string[],
    userId: string,
  ): Promise<JobProgress[]> {
    if (jobIds.length === 0) return [];

    const keys = jobIds.map(id => this.getProgressKey(id, userId));
    const results = await this.redis.mget(...keys);

    return results
      .filter((data): data is string => data !== null)
      .map(data => JSON.parse(data) as JobProgress);
  }

  /**
   * Delete job progress
   */
  async deleteProgress(jobId: string, userId: string): Promise<void> {
    await this.redis.del(this.getProgressKey(jobId, userId));
    await this.removeUserJob(userId, jobId);
  }

  /**
   * Get all active jobs for a user
   */
  async getUserActiveJobs(userId: string): Promise<JobProgress[]> {
    const jobIds = await this.redis.smembers(this.getUserJobsKey(userId));
    if (jobIds.length === 0) return [];

    const progressList = await this.getMultipleProgress(jobIds, userId);

    return progressList.filter(
      p => p.status === JobStatus.QUEUED || p.status === JobStatus.PROCESSING,
    );
  }

  // Private helpers

  private async setProgress(
    jobId: string,
    progress: JobProgress,
    userId: string,
  ): Promise<void> {
    await this.redis.setex(
      this.getProgressKey(jobId, userId),
      this.TTL,
      JSON.stringify(progress),
    );
  }

  private getProgressKey(jobId: string, userId: string): string {
    return `nxtpro:progress:${userId}:${jobId}`;
  }

  private getUserJobsKey(userId: string): string {
    return `nxtpro:user:${userId}:jobs`;
  }

  private async addUserJob(userId: string, jobId: string): Promise<void> {
    const key = this.getUserJobsKey(userId);
    await this.redis.sadd(key, jobId);
    await this.redis.expire(key, this.TTL);
  }

  private async removeUserJob(userId: string, jobId: string): Promise<void> {
    await this.redis.srem(this.getUserJobsKey(userId), jobId);
  }

  private calculateProgress(
    currentStepIndex: number,
    totalSteps: number,
    manualProgress?: number,
  ): number {
    if (manualProgress !== undefined) {
      return Math.min(100, Math.max(0, manualProgress));
    }
    if (totalSteps <= 0) return 0;
    return Math.min(
      100,
      Math.floor(((currentStepIndex + 1) / totalSteps) * 100),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
