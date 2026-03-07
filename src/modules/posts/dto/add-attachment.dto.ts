import {
  IsIn,
  IsInt,
  IsOptional,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class AddAttachmentDto {
  @IsUrl()
  @MaxLength(2048)
  url: string;

  @IsIn(['image', 'video'])
  contentType: 'image' | 'video';

  @IsOptional()
  @IsInt()
  @Min(0)
  videoDuration?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  videoThumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
