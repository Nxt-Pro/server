import { ModerationResult } from '@/common/enums';

export interface ModerationAnalysis {
  verdict: ModerationResult;
  confidence: number;
  isFootballRelated: boolean;
  inappropriateContent: boolean;
  flags: string[];
  details: {
    violence?: number;
    adult?: number;
    offensive?: number;
    spam?: number;
  };
}
