import { IsOptional, IsString } from 'class-validator';

export class VerifyPlayerDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
