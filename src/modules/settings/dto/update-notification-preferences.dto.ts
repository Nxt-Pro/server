import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  chatRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  chatAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  connections?: boolean;

  @IsOptional()
  @IsBoolean()
  postEngagement?: boolean;

  @IsOptional()
  @IsBoolean()
  eventUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  verificationUpdates?: boolean;
}
