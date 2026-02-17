import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AiController } from './ai.controller';
import {
  AI_MODEL_SERVICE,
  MockAiModelService,
  RealAiModelService,
} from './services';
import { VideoAnalysisService } from './video-analysis.service';

import { AiConfig } from '@/config';
import { RepositoriesModule } from '@/database/repositories.module';
import { QueuesModule } from '@/queues/queues.module';

@Module({
  imports: [RepositoriesModule, forwardRef(() => QueuesModule), ConfigModule],
  controllers: [AiController],
  providers: [
    VideoAnalysisService,
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
  exports: [VideoAnalysisService, AI_MODEL_SERVICE],
})
export class AiModule {}
