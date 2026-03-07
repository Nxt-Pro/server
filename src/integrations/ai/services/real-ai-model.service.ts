import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IAiModelService, SkillAnalysisInput, SkillAnalysisOutput } from '.';

import type { ModerationAnalysis } from '@/common/types';
import { AiConfig } from '@/config';

@Injectable()
export class RealAiModelService implements IAiModelService {
  private readonly logger = new Logger(RealAiModelService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    const aiConfig = this.configService.getOrThrow<AiConfig>('ai');
    this.apiUrl = aiConfig.apiUrl || '';
    this.apiKey = aiConfig.apiKey || '';
  }

  analyzeSkill(input: SkillAnalysisInput): Promise<SkillAnalysisOutput> {
    this.logger.log(
      `Analyzing skill: ${input.skill} for video ${input.videoUrl}`,
    );

    // TODO: Implement actual HTTP call to AI API
    /*
    const response = await fetch(`${this.apiUrl}/analyze-skill`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: input.videoUrl,
        analysis_type: input.analysisType,
        skill: input.skill,
      }),
    });
    
    const data = await response.json();
    return this.mapSkillAnalysisResponse(data);
    */

    return Promise.reject(
      new Error(
        'AI model integration not implemented. Set USE_MOCK_AI=true to use mock service.',
      ),
    );
  }

  moderateVideo(videoUrl: string): Promise<ModerationAnalysis> {
    this.logger.log(`Moderating video: ${videoUrl}`);

    // TODO: Implement actual HTTP call to AI API
    /*
    const response = await fetch(`${this.apiUrl}/moderate-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
      }),
    });
    
    const data = await response.json();
    return this.mapModerationResponse(data);
    */

    return Promise.reject(
      new Error(
        'AI model integration not implemented. Set USE_MOCK_AI=true to use mock service.',
      ),
    );
  }
}
