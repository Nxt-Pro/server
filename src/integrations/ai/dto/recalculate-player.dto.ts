import { IsEnum, IsOptional } from 'class-validator';

import { AnalysisType } from '@/common/enums';
import { IsUlid } from '@/validators';

export class RecalculatePlayerDto {
  @IsUlid()
  playerId: string;

  @IsOptional()
  @IsEnum(AnalysisType)
  analysisType?: AnalysisType;
}
