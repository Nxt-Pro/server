import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { BaseProducer } from './base.producer';

import { JobType, QueueName } from '@/common/enums';
import {
  DEFAULT_JOB_OPTIONS,
  VideoModerationJobPayload,
  VideoUploadJobPayload,
} from '@/common/types';
import { ProgressTrackerService } from '@/queues/services';
import type { BullQueue } from '@/queues/types';

@Injectable()
export class VideoUploadProducer extends BaseProducer {
  protected readonly logger = new Logger(VideoUploadProducer.name);

  constructor(
    @InjectQueue(QueueName.VIDEO_UPLOAD) queue: BullQueue,
    progressTracker: ProgressTrackerService,
  ) {
    super(queue, progressTracker);
  }

  /**
   * Queue a video upload job
   */
  async queueVideoUpload(
    payload: VideoUploadJobPayload,
  ): Promise<{ jobId: string }> {
    this.logger.log(
      `Queueing video upload for video ${payload.videoId} by user ${payload.userId}`,
    );

    const job = await this.queue.add(JobType.VIDEO_UPLOAD, payload, {
      ...DEFAULT_JOB_OPTIONS,
      priority: 2,
    });

    const jobId = job.id ?? 'unknown';
    await this.progressTracker.initProgress(jobId, 'upload', 3, payload.userId);

    this.logger.log(`Video upload job queued with ID: ${jobId}`);

    return { jobId };
  }

  /**
   * Queue a video moderation job (called after upload completes)
   */
  async queueVideoModeration(
    payload: VideoModerationJobPayload,
  ): Promise<{ jobId: string }> {
    this.logger.log(
      `Queueing video moderation for attachment ${payload.attachmentId}`,
    );

    const job = await this.queue.add(JobType.VIDEO_MODERATION, payload, {
      ...DEFAULT_JOB_OPTIONS,
      priority: 1,
    });

    const jobId = job.id ?? 'unknown';
    this.logger.log(`Video moderation job queued with ID: ${jobId}`);

    return { jobId };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    await job.retry?.();
    this.logger.log(`Job ${jobId} retried`);

    return true;
  }
}
