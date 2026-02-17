import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { BaseProducer } from './base.producer';

import { AnalysisType, JobType, QueueName } from '@/common/enums';
import {
  JobProgress,
  PRIORITY_JOB_OPTIONS,
  SkillAnalysisJobPayload,
} from '@/common/types';
import { ProgressTrackerService } from '@/queues/services';
import type { BullQueue } from '@/queues/types';

@Injectable()
export class SkillAnalysisProducer extends BaseProducer {
  protected readonly logger = new Logger(SkillAnalysisProducer.name);

  constructor(
    @InjectQueue(QueueName.SKILL_ANALYSIS) queue: BullQueue,
    progressTracker: ProgressTrackerService,
  ) {
    super(queue, progressTracker);
  }

  /**
   * Queue a skill analysis job
   */
  async queueSkillAnalysis(
    payload: SkillAnalysisJobPayload,
  ): Promise<{ jobId: string }> {
    this.logger.log(
      `Queueing skill analysis for video ${payload.videoId} (${payload.analysisType})`,
    );

    const jobType =
      payload.analysisType === AnalysisType.OUTFIELD
        ? JobType.SKILL_ANALYSIS_OUTFIELD
        : JobType.SKILL_ANALYSIS_GOALKEEPER;

    const totalSteps = 6;

    const job = await this.queue.add(jobType, payload, {
      ...PRIORITY_JOB_OPTIONS,
      priority: 1,
    });

    const jobId = job.id ?? 'unknown';

    await this.progressTracker.initProgress(
      jobId,
      'analysis',
      totalSteps,
      payload.requestedBy,
    );

    this.logger.log(`Skill analysis job queued with ID: ${jobId}`);

    return { jobId };
  }

  /**
   * Queue multiple skill analyses for batch processing
   */
  async queueBatchAnalysis(
    payloads: SkillAnalysisJobPayload[],
  ): Promise<{ jobIds: string[] }> {
    this.logger.log(
      `Queueing batch skill analysis for ${payloads.length} videos`,
    );

    const results = await Promise.all(
      payloads.map(payload => this.queueSkillAnalysis(payload)),
    );

    const jobIds = results.map(result => result.jobId);
    this.logger.log(`Batch analysis queued: ${jobIds.length} jobs`);

    return { jobIds };
  }

  /**
   * Get progress for multiple jobs
   */
  async getBatchProgress(jobIds: string[], userId: string): Promise<unknown> {
    return this.progressTracker.getMultipleProgress(jobIds, userId);
  }

  /**
   * Get all active analysis jobs for a user
   */
  async getUserActiveJobs(userId: string): Promise<JobProgress[]> {
    return this.progressTracker.getUserActiveJobs(userId);
  }
}
