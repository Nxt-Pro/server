import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ReportStatus } from '@/common/enums';

export class ResolveReportDto {
  @IsEnum([ReportStatus.RESOLVED, ReportStatus.DISMISSED])
  status: ReportStatus.RESOLVED | ReportStatus.DISMISSED;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
