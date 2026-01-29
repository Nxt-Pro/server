import { IsNotEmpty, IsString } from 'class-validator';

export class StartChatDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;
}
