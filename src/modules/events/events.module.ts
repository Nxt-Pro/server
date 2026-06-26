import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { RegistrationsModule } from './submodules/registrations/registrations.module';
import { Event, User } from '@/database/entities';
import { MailModule } from '@/integrations/mail/mail.module';
import { SettingsModule } from '@/modules/settings';

@Module({
  imports: [
    MailModule,
    SettingsModule,
    TypeOrmModule.forFeature([Event, User]),
    RegistrationsModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
