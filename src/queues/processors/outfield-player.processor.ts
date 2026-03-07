import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseSkillAnalysisProcessor } from './base-skill-analysis.processor';

import { AnalysisType, OutfieldSkill } from '@/common/enums';
import { OutfieldSkillScores } from '@/common/types';
import {
  PlayerProfileRepository,
  VideoSkillAnalysisRepository,
} from '@/database/repositories';
import type { IAiModelService } from '@/integrations/ai/services';
import { AI_MODEL_SERVICE } from '@/integrations/ai/services';
import { ProgressTrackerService } from '@/queues/services';

/**
 * Processor for outfield player skill analysis
 */
@Injectable()
export class OutfieldPlayerProcessor extends BaseSkillAnalysisProcessor<
  OutfieldSkill,
  OutfieldSkillScores
> {
  protected readonly logger = new Logger(OutfieldPlayerProcessor.name);

  constructor(
    @Inject(AI_MODEL_SERVICE) aiModel: IAiModelService,
    progressTracker: ProgressTrackerService,
    analysisRepository: VideoSkillAnalysisRepository,
    playerRepository: PlayerProfileRepository,
  ) {
    super(aiModel, progressTracker, analysisRepository, playerRepository);
  }

  protected getSkillList(): OutfieldSkill[] {
    return [
      OutfieldSkill.PACE,
      OutfieldSkill.DRIBBLING,
      OutfieldSkill.SHOOTING,
      OutfieldSkill.DEFENDING,
      OutfieldSkill.PASSING,
      OutfieldSkill.PHYSICAL,
    ];
  }

  protected getAnalysisType(): AnalysisType {
    return AnalysisType.OUTFIELD;
  }

  protected calculateOverallScore(scores: OutfieldSkillScores): number {
    const weights = {
      pace: 0.15,
      dribbling: 0.2,
      shooting: 0.2,
      defending: 0.15,
      passing: 0.2,
      physical: 0.1,
    };
    return Math.round(
      scores.pace * weights.pace +
        scores.dribbling * weights.dribbling +
        scores.shooting * weights.shooting +
        scores.defending * weights.defending +
        scores.passing * weights.passing +
        scores.physical * weights.physical,
    );
  }
}
