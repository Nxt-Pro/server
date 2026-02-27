import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminGuard } from './guards';
import {
  AdminAnalyticsService,
  AdminAuditService,
  AdminModerationService,
  AdminVerificationService,
} from './services';

import { Connection, Event, Post } from '@/database/entities';
import { RepositoriesModule } from '@/database/repositories.module';

@Module({
  imports: [
    RepositoriesModule,
    // TODO: remove once all repositories are reachable via RepositoriesModule exports
    TypeOrmModule.forFeature([Post, Event, Connection]),
  ],
  controllers: [AdminController],
  providers: [
    AdminGuard,
    AdminModerationService,
    AdminVerificationService,
    AdminAnalyticsService,
    AdminAuditService,
  ],
  exports: [
    AdminModerationService,
    AdminVerificationService,
    AdminAnalyticsService,
    AdminAuditService,
  ],
})
export class AdminModule {}
