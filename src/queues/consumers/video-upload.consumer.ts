import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { BaseQueueConsumer } from './base-queue.consumer';

import { JobType, QueueName } from '@/common/enums';
import {
  VideoModerationJobPayload,
  VideoUploadJobPayload,
} from '@/common/types';
import { ModerationProcessor } from '@/queues/processors/moderation.processor';
import { UploadProcessor } from '@/queues/processors/upload.processor';
import { VideoUploadProducer } from '@/queues/producers/video-upload.producer';
import { ProgressTrackerService } from '@/queues/services';
import type { BullJob, ProcessorJob } from '@/queues/types';

/** Union of all job payloads handled by this consumer */
type VideoUploadJobData = VideoUploadJobPayload | VideoModerationJobPayload;

/**
 * Consumer for video upload and moderation jobs
 */
@Processor(QueueName.VIDEO_UPLOAD, {
  concurrency: 5, // Process 5 jobs concurrently
})
export class VideoUploadConsumer extends BaseQueueConsumer {
  protected readonly logger = new Logger(VideoUploadConsumer.name);

  private readonly uploadProcessor: UploadProcessor;
  private readonly moderationProcessor: ModerationProcessor;
  private readonly progressTracker: ProgressTrackerService;
  private readonly videoUploadProducer: VideoUploadProducer;

  constructor(
    uploadProcessor: UploadProcessor,
    moderationProcessor: ModerationProcessor,
    progressTracker: ProgressTrackerService,
    videoUploadProducer: VideoUploadProducer,
  ) {
    super();
    this.uploadProcessor = uploadProcessor;
    this.moderationProcessor = moderationProcessor;
    this.progressTracker = progressTracker;
    this.videoUploadProducer = videoUploadProducer;
  }

  async process(job: BullJob<VideoUploadJobData>): Promise<unknown> {
    const jobId = job.id;
    if (!jobId) {
      throw new Error('Job has no id');
    }

    this.logger.log(`Processing job ${jobId} of type ${job.name}`);

    try {
      switch (job.name as JobType) {
        case JobType.VIDEO_UPLOAD:
          return await this.processVideoUpload(
            job as BullJob<VideoUploadJobPayload>,
            jobId,
          );

        case JobType.VIDEO_MODERATION:
          return await this.processVideoModeration(
            job as BullJob<VideoModerationJobPayload>,
            jobId,
          );

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Job ${jobId} failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      const userId = job.data.userId;
      await this.progressTracker.markFailed(jobId, userId, message);

      throw error;
    }
  }

  /** Adapter so processors receive job with required updateProgress(progress: number) */
  private toProcessorJob(job: BullJob): ProcessorJob {
    return {
      updateProgress: (p: number) =>
        job.updateProgress?.(p) ?? Promise.resolve(),
    };
  }

  /**
   * Process video upload job
   */
  private async processVideoUpload(
    job: BullJob<VideoUploadJobPayload>,
    jobId: string,
  ): Promise<unknown> {
    this.logger.log(`Processing video upload for video ${job.data.videoId}`);

    await this.progressTracker.markProcessing(
      jobId,
      job.data.userId,
      'Uploading video file...',
      1,
    );

    const result = await this.uploadProcessor.processUpload(
      job.data,
      this.toProcessorJob(job),
    );

    await this.progressTracker.updateProgress(jobId, job.data.userId, {
      currentStep: 'Upload complete, queuing moderation...',
      currentStepIndex: 2,
      progress: 50,
    });

    await this.videoUploadProducer.queueVideoModeration({
      videoId: job.data.videoId,
      userId: job.data.userId,
      attachmentId: job.data.attachmentId,
      videoUrl: result.videoUrl,
    });

    await this.progressTracker.markCompleted(jobId, job.data.userId, result);

    this.logger.log(`Video upload completed for video ${job.data.videoId}`);

    return result;
  }

  /**
   * Process video moderation job
   */
  private async processVideoModeration(
    job: BullJob<VideoModerationJobPayload>,
    jobId: string,
  ): Promise<unknown> {
    this.logger.log(
      `Processing video moderation for attachment ${job.data.attachmentId}`,
    );

    await this.progressTracker.markProcessing(
      jobId,
      job.data.userId,
      'Checking content moderation...',
      1,
    );

    const result = await this.moderationProcessor.processModeration(
      job.data,
      this.toProcessorJob(job),
    );

    await this.progressTracker.markCompleted(jobId, job.data.userId, result);

    this.logger.log(
      `Video moderation completed for attachment ${job.data.attachmentId}`,
    );

    return result;
  }
}
