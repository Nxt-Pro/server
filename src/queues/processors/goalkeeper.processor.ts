import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseSkillAnalysisProcessor } from './base-skill-analysis.processor';

import { AnalysisType, GoalkeeperSkill } from '@/common/enums';
import { GoalkeeperSkillScores } from '@/common/types';
import {
  PlayerProfileRepository,
  VideoSkillAnalysisRepository,
} from '@/database/repositories';
import type { IAiModelService } from '@/integrations/ai/services';
import { AI_MODEL_SERVICE } from '@/integrations/ai/services';
import { ProgressTrackerService } from '@/queues/services';

/**
 * Processor for goalkeeper skill analysis
 */
@Injectable()
export class GoalkeeperProcessor extends BaseSkillAnalysisProcessor<
  GoalkeeperSkill,
  GoalkeeperSkillScores
> {
  protected readonly logger = new Logger(GoalkeeperProcessor.name);

  constructor(
    @Inject(AI_MODEL_SERVICE) aiModel: IAiModelService,
    progressTracker: ProgressTrackerService,
    analysisRepository: VideoSkillAnalysisRepository,
    playerRepository: PlayerProfileRepository,
  ) {
    super(aiModel, progressTracker, analysisRepository, playerRepository);
  }

  protected getSkillList(): GoalkeeperSkill[] {
    return [
      GoalkeeperSkill.DIVING,
      GoalkeeperSkill.REFLEXES,
      GoalkeeperSkill.HANDLING,
      GoalkeeperSkill.SPEED,
      GoalkeeperSkill.KICKING,
      GoalkeeperSkill.POSITIONING,
    ];
  }

  protected getAnalysisType(): AnalysisType {
    return AnalysisType.GOALKEEPER;
  }

  protected calculateOverallScore(scores: GoalkeeperSkillScores): number {
    const weights = {
      diving: 0.2,
      reflexes: 0.25,
      handling: 0.2,
      speed: 0.1,
      kicking: 0.15,
      positioning: 0.1,
    };
    return Math.round(
      scores.diving * weights.diving +
        scores.reflexes * weights.reflexes +
        scores.handling * weights.handling +
        scores.speed * weights.speed +
        scores.kicking * weights.kicking +
        scores.positioning * weights.positioning,
    );
  }
}
