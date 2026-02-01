import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, User } from '@/database/entities';
import { FirebaseModule } from '@/modules/firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    EventEmitterModule,
    FirebaseModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
