import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePlayerSkillScoreDto {
  @IsString()
  @MaxLength(50)
  skill: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsBoolean()
  aiScored?: boolean;
}
