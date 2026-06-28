import { Injectable, Logger } from '@nestjs/common';

import { IAiModelService, SkillAnalysisInput, SkillAnalysisOutput } from '.';

import type { ModerationAnalysis } from '@/common/types';

@Injectable()
export class MockAiModelService implements IAiModelService {
  private readonly logger = new Logger(MockAiModelService.name);

  analyzeSkill(input: SkillAnalysisInput): Promise<SkillAnalysisOutput> {
    this.logger.log(
      `[MOCK DISABLED] Requested skill: ${input.skill} for video ${input.videoUrl}`,
    );

    return Promise.reject(
      new Error(
        'Mock AI scoring is disabled. Configure AI_SCORING_ENABLED=true and AI_SKILL_SERVICE_URL to score skills.',
      ),
    );
  }

  moderateVideo(videoUrl: string): Promise<ModerationAnalysis> {
    this.logger.log(`[MOCK DISABLED] Moderating video: ${videoUrl}`);

    return Promise.reject(
      new Error(
        'Mock AI moderation is disabled. Configure AI_MODERATION_SERVICE_URL to moderate videos.',
      ),
    );
  }
}
