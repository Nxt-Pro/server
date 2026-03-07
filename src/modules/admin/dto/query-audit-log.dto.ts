import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { AuditLogAction, SortOrder } from '@/common/enums';

export class QueryAuditLogDto {
  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
