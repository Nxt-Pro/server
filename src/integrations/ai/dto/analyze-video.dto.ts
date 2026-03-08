import { IsEnum } from 'class-validator';

import { AnalysisType } from '@/common/enums';
import { IsUlid } from '@/common/validators';

export class AnalyzeVideoDto {
  @IsUlid()
  videoId: string;

  @IsEnum(AnalysisType)
  analysisType: AnalysisType;
}
