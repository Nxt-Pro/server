import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { BaseQueueConsumer } from './base-queue.consumer';

import { JobType, QueueName } from '@/common/enums';
import {
  SkillAnalysisJobPayload,
  SkillScoringJobPayload,
} from '@/common/types';
import { normalizeAiError } from '@/integrations/ai/ai-error-normalizer';
import {
  GoalkeeperProcessor,
  OutfieldPlayerProcessor,
  SkillScoringProcessor,
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
  private readonly skillScoringProcessor: SkillScoringProcessor;
  private readonly progressTracker: ProgressTrackerService;

  constructor(
    outfieldProcessor: OutfieldPlayerProcessor,
    goalkeeperProcessor: GoalkeeperProcessor,
    skillScoringProcessor: SkillScoringProcessor,
    progressTracker: ProgressTrackerService,
  ) {
    super();
    this.outfieldProcessor = outfieldProcessor;
    this.goalkeeperProcessor = goalkeeperProcessor;
    this.skillScoringProcessor = skillScoringProcessor;
    this.progressTracker = progressTracker;
  }

  async process(
    job: BullJob<SkillAnalysisJobPayload | SkillScoringJobPayload>,
  ): Promise<unknown> {
    const jobId = job.id;
    const jobType = job.name as JobType;
    if (!jobId) {
      throw new Error('Job has no id');
    }

    this.logger.log(this.describeJob(job, jobId));

    try {
      await this.progressTracker.markProcessing(
        jobId,
        job.data.requestedBy,
        'Starting skill analysis...',
        0,
      );

      let result: unknown;

      switch (jobType) {
        case JobType.SKILL_SCORING:
          result = await this.processSkillScoring(job, jobId);
          break;

        case JobType.SKILL_ANALYSIS_OUTFIELD:
          result = await this.processOutfieldAnalysis(
            job as BullJob<SkillAnalysisJobPayload>,
            jobId,
          );
          break;

        case JobType.SKILL_ANALYSIS_GOALKEEPER:
          result = await this.processGoalkeeperAnalysis(
            job as BullJob<SkillAnalysisJobPayload>,
            jobId,
          );
          break;

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      await this.progressTracker.markCompleted(
        jobId,
        job.data.requestedBy,
        result,
      );

      this.logger.log(`Skill analysis job ${jobId} completed`);

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Job ${jobId} failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      const isFinalAttempt = this.isFinalAttempt(job);
      const safeFailure = normalizeAiError(error, {
        serviceName: 'ai-skills',
        skillKey:
          jobType === JobType.SKILL_SCORING
            ? (job.data as SkillScoringJobPayload).skillKey
            : undefined,
        operation: 'scoring',
      });
      let progressFailureMessage = safeFailure.message;

      if (jobType === JobType.SKILL_SCORING && isFinalAttempt) {
        const normalized = await this.skillScoringProcessor.markFailed(
          job.data as SkillScoringJobPayload,
          error,
        );
        progressFailureMessage = normalized.message;
      }

      if (isFinalAttempt || jobType !== JobType.SKILL_SCORING) {
        await this.progressTracker.markFailed(
          jobId,
          job.data.requestedBy,
          progressFailureMessage,
        );
      }

      throw error;
    }
  }

  private describeJob(
    job: BullJob<SkillAnalysisJobPayload | SkillScoringJobPayload>,
    jobId: string,
  ): string {
    const jobType = job.name as JobType;
    if (jobType === JobType.SKILL_SCORING) {
      const data = job.data as SkillScoringJobPayload;
      return `Processing AI skill scoring ${jobId} for ${data.skillKey}`;
    }
    const data = job.data as SkillAnalysisJobPayload;
    return `Processing skill analysis ${jobId} for video ${data.videoId} (${data.analysisType})`;
  }

  private isFinalAttempt(
    job: BullJob<SkillAnalysisJobPayload | SkillScoringJobPayload>,
  ): boolean {
    const attempts = Number(job.opts?.attempts ?? 1);
    const attemptsMade = Number(job.attemptsMade ?? 0);
    return attemptsMade + 1 >= attempts;
  }

  private async processSkillScoring(
    job: BullJob<SkillAnalysisJobPayload | SkillScoringJobPayload>,
    jobId: string,
  ): Promise<unknown> {
    return this.skillScoringProcessor.process(
      job.data as SkillScoringJobPayload,
      jobId,
    );
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
