import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['tournament', 'trial', 'workshop'])
  @IsOptional()
  eventType?: 'tournament' | 'trial' | 'workshop';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  venueId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  positionsTargeted?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxParticipants?: number;

  @IsDateString()
  @IsOptional()
  registrationDeadline?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  entryFee?: number;

  @IsObject()
  @IsOptional()
  schedule?: Record<string, unknown>[];

  @IsArray()
  @IsOptional()
  prizes?: string[];

  @IsArray()
  @IsOptional()
  requirements?: string[];

  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;
}
