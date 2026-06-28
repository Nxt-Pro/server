import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export interface SkillScoringMediaDto {
  url?: unknown;
  mimeType?: unknown;
  fileName?: unknown;
  size?: unknown;
  sizeBytes?: unknown;
}

export class SubmitSkillScoringDto {
  @IsString()
  @MaxLength(50)
  skill: string;

  @IsObject()
  media: Record<string, SkillScoringMediaDto>;

  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(260)
  heightCm?: number;
}
