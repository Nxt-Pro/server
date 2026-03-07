import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SkillAnalysisConsumer, VideoUploadConsumer } from './consumers';
import {
  GoalkeeperProcessor,
  ModerationProcessor,
  OutfieldPlayerProcessor,
  UploadProcessor,
} from './processors';
import { SkillAnalysisProducer, VideoUploadProducer } from './producers';
import { QueueConfigService } from './queue-config.service';

import { ProgressTrackerService } from './services';

import { QueueName } from '@/common/enums';
import { RepositoriesModule } from '@/database/repositories.module';
import { AiModule } from '@/integrations/ai/ai.module';

@Module({
  imports: [
    RepositoriesModule,
    forwardRef(() => AiModule),

    // Register BullMQ queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const queueConfig = new QueueConfigService(configService);
        return {
          connection: queueConfig.getRedisConnection(),
        };
      },
      inject: [ConfigService],
    }),

    // Register individual queues
    BullModule.registerQueue(
      {
        name: QueueName.VIDEO_UPLOAD,
      },
      {
        name: QueueName.SKILL_ANALYSIS,
      },
    ),
  ],
  providers: [
    // Config
    QueueConfigService,

    // Producers
    VideoUploadProducer,
    SkillAnalysisProducer,

    // Consumers
    VideoUploadConsumer,
    SkillAnalysisConsumer,

    // Processors
    UploadProcessor,
    ModerationProcessor,
    OutfieldPlayerProcessor,
    GoalkeeperProcessor,

    // Utils
    ProgressTrackerService,
  ],
  exports: [
    // Export producers for use in other modules
    VideoUploadProducer,
    SkillAnalysisProducer,
    ProgressTrackerService,
  ],
})
export class QueuesModule {}
