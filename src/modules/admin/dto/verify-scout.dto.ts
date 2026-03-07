import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ScoutVerificationStatus } from '@/common/enums';

export class VerifyScoutDto {
  @IsEnum([ScoutVerificationStatus.VERIFIED, ScoutVerificationStatus.REJECTED])
  status: ScoutVerificationStatus.VERIFIED | ScoutVerificationStatus.REJECTED;

  @IsOptional()
  @IsString()
  notes?: string;
}
