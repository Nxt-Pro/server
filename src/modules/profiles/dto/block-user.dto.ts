import { IsNotEmpty, IsString } from 'class-validator';

export class BlockUserDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
