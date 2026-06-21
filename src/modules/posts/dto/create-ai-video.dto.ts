import { IsInt, IsOptional, MaxLength, Min } from 'class-validator';

import { IsUrl } from '@/common/validators/url.validator';

export class CreateAiVideoDto {
  @IsUrl()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  videoDuration?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  videoThumbnailUrl?: string;
}
