import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { CacheModule } from '@/common/cache';
import { User, Venue } from '@/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Venue, User]), CacheModule],
  providers: [VenuesService],
  controllers: [VenuesController],
  exports: [VenuesService],
})
export class VenuesModule {}
