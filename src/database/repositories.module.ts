import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AttachmentRepository,
  AiSkillScoreJobRepository,
  AuditLogRepository,
  MediaModerationRepository,
  PlayerProfileRepository,
  ReportRepository,
  ScoutProfileRepository,
  UserRepository,
  VideoRepository,
  VideoSkillAnalysisRepository,
} from './repositories';

import {
  Attachment,
  AiSkillScoreJob,
  AuditLog,
  MediaModeration,
  PlayerProfile,
  Report,
  ScoutProfile,
  User,
  Video,
  VideoSkillAnalysis,
} from '@/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attachment,
      AiSkillScoreJob,
      AuditLog,
      MediaModeration,
      PlayerProfile,
      Report,
      ScoutProfile,
      User,
      Video,
      VideoSkillAnalysis,
    ]),
  ],
  providers: [
    AttachmentRepository,
    AiSkillScoreJobRepository,
    AuditLogRepository,
    MediaModerationRepository,
    PlayerProfileRepository,
    ReportRepository,
    ScoutProfileRepository,
    UserRepository,
    VideoRepository,
    VideoSkillAnalysisRepository,
  ],
  exports: [
    AttachmentRepository,
    AiSkillScoreJobRepository,
    AuditLogRepository,
    MediaModerationRepository,
    PlayerProfileRepository,
    ReportRepository,
    ScoutProfileRepository,
    UserRepository,
    VideoRepository,
    VideoSkillAnalysisRepository,
  ],
})
export class RepositoriesModule {}
