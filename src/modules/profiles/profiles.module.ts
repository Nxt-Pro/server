import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import { PlayerProfileController } from './player-profile.controller';
import { ScoutProfileController } from './scout-profile.controller';
import { UserController } from './user.controller';
import { ProfileUploadController } from './profile-upload.controller';
import {
  PlayerDiscoveryController,
  ScoutDiscoveryController,
  SearchController,
} from './discovery.controller';
import {
  Block,
  Mute,
  PlayerProfile,
  ScoutProfile,
  User,
} from '@/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PlayerProfile, ScoutProfile, Block, Mute]),
  ],
  controllers: [
    PlayerProfileController,
    ScoutProfileController,
    UserController,
    ProfileUploadController,
    PlayerDiscoveryController,
    ScoutDiscoveryController,
    SearchController,
  ],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
