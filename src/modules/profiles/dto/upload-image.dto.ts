import { IsNotEmpty } from 'class-validator';

import { IsUrl } from '@/common/validators/url.validator';

export class UploadImageDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
