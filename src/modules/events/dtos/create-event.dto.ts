import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['tournament', 'trial', 'workshop'])
  @IsNotEmpty()
  eventType: 'tournament' | 'trial' | 'workshop';

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string; // Format: HH:MM:SS

  @IsString()
  @IsOptional()
  endTime?: string; // Format: HH:MM:SS

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
