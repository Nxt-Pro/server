import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class StartChatDto {
  @ValidateIf((o: StartChatDto) => !o.scoutId)
  @IsString()
  @IsNotEmpty()
  playerId?: string;

  @ValidateIf((o: StartChatDto) => !o.playerId)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  scoutId?: string;
}
