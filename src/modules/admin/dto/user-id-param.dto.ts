import { IsUlid } from '@/validators';

export class UserIdParamDto {
  @IsUlid({ message: 'user_id must be a valid ULID' })
  user_id: string;
}
