import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  initialMessage?: string;
}
