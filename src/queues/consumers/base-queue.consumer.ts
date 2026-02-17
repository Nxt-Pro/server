import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import type { BullJob } from '@/queues/types';

/**
 * Base consumer class for shared event handlers
 */
export abstract class BaseQueueConsumer extends WorkerHost {
  protected abstract readonly logger: Logger;

  /**
   * Event: Job completed successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: BullJob): void {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  /**
   * Event: Job failed after all retries
   */
  @OnWorkerEvent('failed')
  onFailed(job: BullJob, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed permanently: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Event: Job is active
   */
  @OnWorkerEvent('active')
  onActive(job: BullJob): void {
    this.logger.log(`Job ${job.id} is now active`);
  }

  /**
   * Event: Job progress updated
   */
  @OnWorkerEvent('progress')
  onProgress(job: BullJob, progress: number): void {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
