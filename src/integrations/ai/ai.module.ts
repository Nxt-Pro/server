import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiController } from './ai.controller';
import { AiRecommendationService } from './ai-recommendation.service';
import {
  AI_MODEL_SERVICE,
  MockAiModelService,
  RealAiModelService,
} from './services';
import { SkillScoringService } from './skill-scoring.service';
import { VideoAnalysisService } from './video-analysis.service';

import { AiConfig } from '@/config';
import {
  Block,
  Bookmark,
  Chat,
  Connection,
  Like,
  Mute,
  PlayerProfile,
  Post,
  ScoutProfile,
  User,
} from '@/database/entities';
import { RepositoriesModule } from '@/database/repositories.module';
import { QueuesModule } from '@/queues/queues.module';

@Module({
  imports: [
    RepositoriesModule,
    TypeOrmModule.forFeature([
      Block,
      Bookmark,
      Chat,
      Connection,
      Like,
      Mute,
      PlayerProfile,
      Post,
      ScoutProfile,
      User,
    ]),
    forwardRef(() => QueuesModule),
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [
    VideoAnalysisService,
    SkillScoringService,
    AiRecommendationService,
    MockAiModelService,
    RealAiModelService,
    {
      provide: AI_MODEL_SERVICE,
      useFactory: (
        configService: ConfigService,
        mockService: MockAiModelService,
        realService: RealAiModelService,
      ) => {
        const aiConfig = configService.getOrThrow<AiConfig>('ai');
        return aiConfig.useMock ? mockService : realService;
      },
      inject: [ConfigService, MockAiModelService, RealAiModelService],
    },
  ],
  exports: [
    VideoAnalysisService,
    SkillScoringService,
    AiRecommendationService,
    AI_MODEL_SERVICE,
  ],
})
export class AiModule {}
