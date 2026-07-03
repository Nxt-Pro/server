import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionsService } from './connections.service';
import {
  PlayerConnectionController,
  ScoutConnectionController,
  ConnectionRespondController,
  PlayerConnectionRespondController,
  ConnectionsListController,
} from './connections.controller';
import {
  Connection,
  PlayerConnection,
  PlayerProfile,
  ScoutProfile,
  User,
} from '@/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Connection,
      PlayerConnection,
      PlayerProfile,
      ScoutProfile,
      User,
    ]),
  ],
  controllers: [
    PlayerConnectionController,
    ScoutConnectionController,
    ConnectionRespondController,
    PlayerConnectionRespondController,
    ConnectionsListController,
  ],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
