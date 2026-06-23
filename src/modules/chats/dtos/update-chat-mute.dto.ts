import { IsBoolean } from 'class-validator';

export class UpdateChatMuteDto {
  @IsBoolean()
  muted: boolean;
}
