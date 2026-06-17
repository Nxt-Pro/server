import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PlayerDiscoveryController,
  ScoutDiscoveryController,
  SearchController,
} from './discovery.controller';
import { PlayerProfileController } from './player-profile.controller';
import { ProfileUploadController } from './profile-upload.controller';
import { ProfilesService } from './profiles.service';
import { ScoutNotesController } from './scout-notes.controller';
import { ScoutProfileController } from './scout-profile.controller';
import { UserController } from './user.controller';
import {
  Achievement,
  Block,
  CareerTimeline,
  Mute,
  PlayerProfile,
  PlayerStats,
  Post,
  ScoutNotes,
  ScoutProfile,
  User,
  Video,
  VideoSkillAnalysis,
} from '@/database/entities';
import { RepositoriesModule } from '@/database/repositories.module';

@Module({
  imports: [
    RepositoriesModule,
    TypeOrmModule.forFeature([
      User,
      Achievement,
      PlayerProfile,
      ScoutProfile,
      CareerTimeline,
      PlayerStats,
      Post,
      Video,
      VideoSkillAnalysis,
      Block,
      Mute,
      ScoutNotes,
    ]),
  ],
  controllers: [
    PlayerProfileController,
    ScoutProfileController,
    ScoutNotesController,
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
