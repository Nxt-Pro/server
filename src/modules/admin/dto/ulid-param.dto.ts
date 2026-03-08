import { IsUlid } from '@/common/validators';

export class UlidParamDto {
  @IsUlid()
  id: string;
}
