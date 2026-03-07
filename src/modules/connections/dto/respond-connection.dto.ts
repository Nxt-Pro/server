import { IsIn } from 'class-validator';

export class RespondConnectionDto {
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
