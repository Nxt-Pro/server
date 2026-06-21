import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';

import { IsUrl } from '@/common/validators/url.validator';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  videoDuration?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl()
  videoThumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'connections', 'private'])
  visibility?: 'public' | 'connections' | 'private';
}
