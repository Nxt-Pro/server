import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EventQueryDto {
  @IsOptional()
  @IsEnum(['tournament', 'trial', 'workshop'])
  eventType?: 'tournament' | 'trial' | 'workshop';

  @IsOptional()
  @IsEnum(['pending_approval', 'approved', 'rejected'])
  status?: 'pending_approval' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
