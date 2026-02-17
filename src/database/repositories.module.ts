import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AttachmentRepository,
  MediaModerationRepository,
  PlayerProfileRepository,
  VideoRepository,
  VideoSkillAnalysisRepository,
} from './repositories';

import {
  Attachment,
  MediaModeration,
  PlayerProfile,
  Video,
  VideoSkillAnalysis,
} from '@/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      Attachment,
      PlayerProfile,
      VideoSkillAnalysis,
      MediaModeration,
    ]),
  ],
  providers: [
    VideoRepository,
    AttachmentRepository,
    PlayerProfileRepository,
    VideoSkillAnalysisRepository,
    MediaModerationRepository,
  ],
  exports: [
    VideoRepository,
    AttachmentRepository,
    PlayerProfileRepository,
    VideoSkillAnalysisRepository,
    MediaModerationRepository,
  ],
})
export class RepositoriesModule {}
