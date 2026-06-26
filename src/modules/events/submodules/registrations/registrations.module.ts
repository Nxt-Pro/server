import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import {
  Event,
  EventRegistration,
  PlayerProfile,
  User,
} from '@/database/entities';
import { MailModule } from '@/integrations/mail/mail.module';
import { SettingsModule } from '@/modules/settings';

@Module({
  imports: [
    MailModule,
    SettingsModule,
    TypeOrmModule.forFeature([Event, EventRegistration, PlayerProfile, User]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
