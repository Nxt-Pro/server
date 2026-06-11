import { AnalysisType, GoalkeeperSkill, OutfieldSkill } from '@/common/enums';
import type { ModerationAnalysis } from '@/common/types';

export interface SkillAnalysisInput {
  videoUrl: string;
  analysisType: AnalysisType;
  skill: OutfieldSkill | GoalkeeperSkill;
  /** Used to load `height_cm` for NxtPro endpoints that require it (pace, jump). */
  playerId?: string;
}

export interface SkillAnalysisOutput {
  score: number;
  confidence: number;
  keyMoments: Array<{
    timestamp: number;
    action: string;
    score: number;
  }>;
  attributes: Record<string, number>;
}

export interface IAiModelService {
  /**
   * Analyze a specific skill from a video
   */
  analyzeSkill(_input: SkillAnalysisInput): Promise<SkillAnalysisOutput>;

  /**
   * Moderate video content for appropriateness
   */
  moderateVideo(_videoUrl: string): Promise<ModerationAnalysis>;
}

export const AI_MODEL_SERVICE = Symbol('IAiModelService');
