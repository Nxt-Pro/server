import { IsEnum, IsOptional } from 'class-validator';

import { AnalyticsGranularity, AnalyticsPeriod } from '@/common/enums';

export class QueryAnalyticsDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.THIRTY_DAYS;
}

export class QueryGrowthDto extends QueryAnalyticsDto {
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity = AnalyticsGranularity.DAY;
}
