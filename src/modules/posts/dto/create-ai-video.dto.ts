import { IsInt, IsOptional, IsUrl, MaxLength, Min } from 'class-validator';

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
