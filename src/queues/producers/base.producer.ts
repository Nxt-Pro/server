import { Logger } from '@nestjs/common';

import { ProgressTrackerService } from '@/queues/services';
import type { BullQueue, JobStatusResult } from '@/queues/types';

/**
 * Base producer with shared getJobStatus / cancelJob logic
 */
export abstract class BaseProducer {
  protected abstract readonly logger: Logger;

  protected readonly queue: BullQueue;
  protected readonly progressTracker: ProgressTrackerService;

  constructor(queue: BullQueue, progressTracker: ProgressTrackerService) {
    this.queue = queue;
    this.progressTracker = progressTracker;
  }

  /**
   * Get job status with progress
   */
  async getJobStatus(
    jobId: string,
    userId: string,
  ): Promise<JobStatusResult | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = await this.progressTracker.getProgress(jobId, userId);

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    await this.progressTracker.deleteProgress(jobId, userId);
    this.logger.log(`Job ${jobId} cancelled`);

    return true;
  }
}
