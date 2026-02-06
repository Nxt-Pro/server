import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QueueConfigService } from './queue-config.service';
import { QueueName } from './types';

@Module({
  imports: [
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
  ],
})
export class QueuesModule {}
