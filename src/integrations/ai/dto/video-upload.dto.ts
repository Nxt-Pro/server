import { IsNumber, IsString, Min } from 'class-validator';

import { IsUlid } from '@/validators';

export class VideoUploadDto {
  @IsUlid()
  videoId: string;

  @IsUlid()
  attachmentId: string;

  @IsString()
  filePath: string;

  @IsString()
  originalFileName: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsString()
  mimeType: string;
}
