import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { RegistrationsModule } from './submodules/registrations/registrations.module';
import { Event, User } from '@/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Event, User]), RegistrationsModule],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
