import { IsNotEmpty, IsString } from 'class-validator';

export class MuteUserDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
