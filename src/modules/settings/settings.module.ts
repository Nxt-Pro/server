import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UserNotificationPreference } from '@/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserNotificationPreference])],
  providers: [NotificationPreferencesService],
  exports: [NotificationPreferencesService],
})
export class SettingsModule {}
