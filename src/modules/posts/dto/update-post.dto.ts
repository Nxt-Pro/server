import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { IsUrl } from '@/common/validators/url.validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'connections', 'private'])
  visibility?: 'public' | 'connections' | 'private';

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2048)
  musicUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  musicTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  musicArtist?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60 * 1000)
  musicDurationMs?: number | null;
}
