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

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventRegistration, PlayerProfile, User]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
