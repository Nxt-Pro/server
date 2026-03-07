import { IsNotEmpty, IsUrl } from 'class-validator';

export class UploadImageDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
