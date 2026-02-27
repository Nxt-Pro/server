import { IsUlid } from '@/validators';

export class UlidParamDto {
  @IsUlid()
  id: string;
}
