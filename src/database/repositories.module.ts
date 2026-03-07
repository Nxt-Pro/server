import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AttachmentRepository,
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
