import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '@/integrations/firebase/firebase.module';
import { MailModule } from '@/integrations/mail/mail.module';
import { Notification, User } from '@/database/entities';
import { SettingsModule } from '@/modules/settings';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    EventEmitterModule,
    FirebaseModule,
    MailModule,
    SettingsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
