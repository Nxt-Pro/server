import { AnalysisType } from '@/common/enums';

export interface OutfieldSkillScores {
  pace: number;
  dribbling: number;
  shooting: number;
  defending: number;
  passing: number;
  physical: number;
  overall: number;
}

export interface GoalkeeperSkillScores {
  diving: number;
  reflexes: number;
  handling: number;
  speed: number;
  kicking: number;
  positioning: number;
  overall: number;
}

export type SkillScores = OutfieldSkillScores | GoalkeeperSkillScores;

export interface SkillAnalysisResult {
  videoId: string;
  playerId: string;
  analysisType: AnalysisType;
  scores: SkillScores;
  confidence: number;
  analysisVersion: string;
  processedAt: Date;
  breakdown?: Record<string, unknown>;
}
