import { Injectable, Logger } from '@nestjs/common';

import { SkillScoringJobPayload } from '@/common/types';
import type { NormalizedAiError } from '@/integrations/ai/ai-error-normalizer';
import { SkillScoringService } from '@/integrations/ai/skill-scoring.service';

@Injectable()
export class SkillScoringProcessor {
  private readonly logger = new Logger(SkillScoringProcessor.name);

  constructor(private readonly skillScoringService: SkillScoringService) {}

  async process(
    payload: SkillScoringJobPayload,
    queueJobId: string,
  ): Promise<unknown> {
    this.logger.log(
      `Processing AI scoring job ${payload.scoringJobId} (${payload.skillKey})`,
    );

    return this.skillScoringService.processQueuedJob(payload, queueJobId);
  }

  async markFailed(
    payload: SkillScoringJobPayload,
    error: unknown,
  ): Promise<NormalizedAiError> {
    return this.skillScoringService.markQueuedJobFailed(payload, error);
  }
}
