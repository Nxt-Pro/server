import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCareerTimelineDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  evidenceUrl?: string | null;
}

export class UpdateCareerTimelineDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  evidenceUrl?: string | null;
}

export class CreateAchievementDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsIn(['local', 'regional', 'national', 'international'])
  competitionLevel: 'local' | 'regional' | 'national' | 'international';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  evidenceUrl?: string | null;
}

export class UpdateAchievementDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsIn(['local', 'regional', 'national', 'international'])
  competitionLevel?: 'local' | 'regional' | 'national' | 'international';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  evidenceUrl?: string | null;
}
