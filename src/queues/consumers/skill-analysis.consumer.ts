import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { BaseQueueConsumer } from './base-queue.consumer';

import { JobType, QueueName } from '@/common/enums';
import { SkillAnalysisJobPayload } from '@/common/types';
import {
  GoalkeeperProcessor,
  OutfieldPlayerProcessor,
} from '@/queues/processors';
import { ProgressTrackerService } from '@/queues/services';
import type { BullJob } from '@/queues/types';

/**
 * Consumer for skill analysis jobs
 */
@Processor(QueueName.SKILL_ANALYSIS, {
  concurrency: 3, // Process 3 analysis jobs concurrently (AI-heavy)
})
export class SkillAnalysisConsumer extends BaseQueueConsumer {
  protected readonly logger = new Logger(SkillAnalysisConsumer.name);

  private readonly outfieldProcessor: OutfieldPlayerProcessor;
  private readonly goalkeeperProcessor: GoalkeeperProcessor;
  private readonly progressTracker: ProgressTrackerService;

  constructor(
    outfieldProcessor: OutfieldPlayerProcessor,
    goalkeeperProcessor: GoalkeeperProcessor,
    progressTracker: ProgressTrackerService,
  ) {
    super();
    this.outfieldProcessor = outfieldProcessor;
    this.goalkeeperProcessor = goalkeeperProcessor;
    this.progressTracker = progressTracker;
  }

  async process(job: BullJob<SkillAnalysisJobPayload>): Promise<unknown> {
    const jobId = job.id;
    if (!jobId) {
      throw new Error('Job has no id');
    }

    this.logger.log(
      `Processing skill analysis ${jobId} for video ${job.data.videoId} (${job.data.analysisType})`,
    );

    try {
      await this.progressTracker.markProcessing(
        jobId,
        job.data.requestedBy,
        'Starting skill analysis...',
        0,
      );

      let result: unknown;

      switch (job.name as JobType) {
        case JobType.SKILL_ANALYSIS_OUTFIELD:
          result = await this.processOutfieldAnalysis(job, jobId);
          break;

        case JobType.SKILL_ANALYSIS_GOALKEEPER:
          result = await this.processGoalkeeperAnalysis(job, jobId);
          break;

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      await this.progressTracker.markCompleted(
        jobId,
        job.data.requestedBy,
        result,
      );

      this.logger.log(`Skill analysis completed for video ${job.data.videoId}`);

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Job ${jobId} failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.progressTracker.markFailed(
        jobId,
        job.data.requestedBy,
        message,
      );

      throw error;
    }
  }

  /**
   * Process outfield player skill analysis
   */
  private async processOutfieldAnalysis(
    job: BullJob<SkillAnalysisJobPayload>,
    jobId: string,
  ): Promise<unknown> {
    this.logger.log(
      `Analyzing outfield player skills for video ${job.data.videoId}`,
    );

    return await this.outfieldProcessor.analyzeSkills(job.data, jobId);
  }

  /**
   * Process goalkeeper skill analysis
   */
  private async processGoalkeeperAnalysis(
    job: BullJob<SkillAnalysisJobPayload>,
    jobId: string,
  ): Promise<unknown> {
    this.logger.log(
      `Analyzing goalkeeper skills for video ${job.data.videoId}`,
    );

    return await this.goalkeeperProcessor.analyzeSkills(job.data, jobId);
  }
}
