import { Inject, Injectable, Logger } from '@nestjs/common';

import { ModerationResult, ModerationStatus } from '@/common/enums';
import type { ModerationAnalysis } from '@/common/types';
import { VideoModerationJobPayload } from '@/common/types';
import { MediaModerationRepository } from '@/database/repositories';
import type { IAiModelService } from '@/integrations/ai/services';
import { AI_MODEL_SERVICE } from '@/integrations/ai/services';
import type { ProcessorJob } from '@/queues/types';

@Injectable()
export class ModerationProcessor {
  private readonly logger = new Logger(ModerationProcessor.name);

  private readonly aiModel: IAiModelService;
  private readonly moderationRepository: MediaModerationRepository;

  constructor(
    @Inject(AI_MODEL_SERVICE)
    aiModel: IAiModelService,
    moderationRepository: MediaModerationRepository,
  ) {
    this.aiModel = aiModel;
    this.moderationRepository = moderationRepository;
  }

  async processModeration(
    payload: VideoModerationJobPayload,
    job: ProcessorJob,
  ): Promise<ModerationAnalysis> {
    this.logger.log(
      `Processing moderation for attachment ${payload.attachmentId}`,
    );

    await job.updateProgress(10);

    // Step 1: Update status to processing
    await this.updateModerationStatus(
      payload.attachmentId,
      ModerationStatus.PROCESSING,
    );

    // Step 2: Check if video is football-related
    await job.updateProgress(40);
    const moderationResult = await this.aiModel.moderateVideo(payload.videoUrl);

    // Step 3: Determine final result
    await job.updateProgress(90);

    // Step 4: Update database with results
    await this.saveModerationResult(payload.attachmentId, moderationResult);

    await job.updateProgress(100);

    this.logger.log(
      `Moderation completed for attachment ${payload.attachmentId}: ${moderationResult.verdict}`,
    );

    return moderationResult;
  }

  /**
   * Update moderation status in database
   */
  private async updateModerationStatus(
    attachmentId: string,
    status: ModerationStatus,
  ): Promise<void> {
    this.logger.log(
      `Updating moderation status for ${attachmentId} to ${status}`,
    );

    await this.moderationRepository.updateByAttachmentId(
      attachmentId,
      status === ModerationStatus.COMPLETED
        ? { status, processedAt: new Date() }
        : { status },
    );
  }

  /**
   * Save moderation result to database
   */
  private async saveModerationResult(
    attachmentId: string,
    result: ModerationAnalysis,
  ): Promise<void> {
    this.logger.log(`Saving moderation result for ${attachmentId}`);

    await this.moderationRepository.updateByAttachmentId(attachmentId, {
      status: ModerationStatus.COMPLETED,
      result: {
        flagged: result.verdict !== ModerationResult.APPROVED,
        verdict: result.verdict,
        confidence: result.confidence,
        flags: result.flags,
        details: result.details,
      },
      processedAt: new Date(),
    });

    this.logger.log('Moderation result saved successfully');
  }
}
