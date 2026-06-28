import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Module, Provider, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SkillAnalysisConsumer, VideoUploadConsumer } from './consumers';
import {
  GoalkeeperProcessor,
  ModerationProcessor,
  OutfieldPlayerProcessor,
  SkillScoringProcessor,
  UploadProcessor,
} from './processors';
import { SkillAnalysisProducer, VideoUploadProducer } from './producers';
import { QueueConfigService } from './queue-config.service';

import { ProgressTrackerService } from './services';

import { JobStatus, QueueName } from '@/common/enums';
import { MediaModule } from '@/common/media';
import { JobProgress } from '@/common/types';
import { RepositoriesModule } from '@/database/repositories.module';
import { AiModule } from '@/integrations/ai/ai.module';
import { BullJobFull, BullQueue } from '@/queues/types';

const isQueueInfrastructureDisabled = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.NXTPRO_DISABLE_QUEUES === 'true';

const createInMemoryQueue = (queueName: QueueName): BullQueue => {
  let jobSequence = 0;
  const jobs = new Map<string, BullJobFull>();

  return {
    add(name, data, opts) {
      const id = opts?.jobId ?? `${queueName}-${++jobSequence}`;
      const job: BullJobFull = {
        id,
        name,
        data,
        timestamp: Date.now(),
        getState() {
          return Promise.resolve('waiting');
        },
        remove() {
          jobs.delete(id);
          return Promise.resolve();
        },
        retry() {
          return Promise.resolve(undefined);
        },
      };

      jobs.set(id, job);

      return Promise.resolve(job);
    },
    getJob(jobId) {
      return Promise.resolve(jobs.get(jobId));
    },
  };
};

class InMemoryProgressTrackerService {
  private readonly progressByKey = new Map<string, JobProgress>();
  private readonly userJobIds = new Map<string, Set<string>>();

  initProgress(
    jobId: string,
    type: 'upload' | 'analysis',
    totalSteps: number,
    userId: string,
  ): Promise<void> {
    const progress: JobProgress = {
      jobId,
      type,
      status: JobStatus.QUEUED,
      progress: 0,
      currentStep: 'Initializing...',
      currentStepIndex: 0,
      totalSteps,
      startedAt: new Date(),
    };

    this.progressByKey.set(this.getProgressKey(jobId, userId), progress);

    const userJobs = this.userJobIds.get(userId) ?? new Set<string>();
    userJobs.add(jobId);
    this.userJobIds.set(userId, userJobs);

    return Promise.resolve();
  }

  async updateProgress(
    jobId: string,
    userId: string,
    updates: Partial<JobProgress>,
  ): Promise<void> {
    const progress = await this.getProgress(jobId, userId);
    if (!progress) {
      throw new Error(`Progress not found for job ${jobId}`);
    }

    const currentStepIndex =
      updates.currentStepIndex ?? progress.currentStepIndex;
    const updatedProgress: JobProgress = {
      ...progress,
      ...updates,
      currentStepIndex,
      progress: this.calculateProgress(
        currentStepIndex,
        progress.totalSteps,
        updates.progress,
      ),
    };

    this.progressByKey.set(this.getProgressKey(jobId, userId), updatedProgress);
  }

  async markProcessing(
    jobId: string,
    userId: string,
    currentStep: string,
    stepIndex?: number,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.PROCESSING,
      currentStep,
      currentStepIndex: stepIndex,
    });
  }

  async markCompleted(
    jobId: string,
    userId: string,
    result?: unknown,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.COMPLETED,
      progress: 100,
      currentStep: 'Completed',
      currentStepIndex: Number.MAX_SAFE_INTEGER,
      completedAt: new Date(),
      result,
    });
    this.userJobIds.get(userId)?.delete(jobId);
  }

  async markFailed(
    jobId: string,
    userId: string,
    error: string,
  ): Promise<void> {
    await this.updateProgress(jobId, userId, {
      status: JobStatus.FAILED,
      currentStep: 'Failed',
      completedAt: new Date(),
      error,
    });
    this.userJobIds.get(userId)?.delete(jobId);
  }

  getProgress(jobId: string, userId: string): Promise<JobProgress | null> {
    return Promise.resolve(
      this.progressByKey.get(this.getProgressKey(jobId, userId)) ?? null,
    );
  }

  async getMultipleProgress(
    jobIds: string[],
    userId: string,
  ): Promise<JobProgress[]> {
    const progressList = await Promise.all(
      jobIds.map(jobId => this.getProgress(jobId, userId)),
    );

    return progressList.filter(
      (progress): progress is JobProgress => progress !== null,
    );
  }

  deleteProgress(jobId: string, userId: string): Promise<void> {
    this.progressByKey.delete(this.getProgressKey(jobId, userId));
    this.userJobIds.get(userId)?.delete(jobId);

    return Promise.resolve();
  }

  async getUserActiveJobs(userId: string): Promise<JobProgress[]> {
    const jobIds = Array.from(this.userJobIds.get(userId) ?? []);
    const progressList = await this.getMultipleProgress(jobIds, userId);

    return progressList.filter(
      progress =>
        progress.status === JobStatus.QUEUED ||
        progress.status === JobStatus.PROCESSING,
    );
  }

  private getProgressKey(jobId: string, userId: string): string {
    return `${userId}:${jobId}`;
  }

  private calculateProgress(
    currentStepIndex: number,
    totalSteps: number,
    manualProgress?: number,
  ): number {
    if (manualProgress !== undefined) {
      return Math.min(100, Math.max(0, manualProgress));
    }
    if (totalSteps <= 0) return 0;
    return Math.min(
      100,
      Math.floor(((currentStepIndex + 1) / totalSteps) * 100),
    );
  }
}

const testQueueProviders: Provider[] = [
  {
    provide: getQueueToken(QueueName.VIDEO_UPLOAD),
    useFactory: () => createInMemoryQueue(QueueName.VIDEO_UPLOAD),
  },
  {
    provide: getQueueToken(QueueName.SKILL_ANALYSIS),
    useFactory: () => createInMemoryQueue(QueueName.SKILL_ANALYSIS),
  },
  {
    provide: ProgressTrackerService,
    useClass: InMemoryProgressTrackerService,
  },
];

const queueInfrastructureDisabled = isQueueInfrastructureDisabled();

@Module({
  imports: [
    RepositoriesModule,
    MediaModule,
    forwardRef(() => AiModule),

    ...(queueInfrastructureDisabled
      ? []
      : [
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
        ]),
  ],
  providers: [
    // Config
    ...(queueInfrastructureDisabled ? [] : [QueueConfigService]),

    // Producers
    VideoUploadProducer,
    SkillAnalysisProducer,

    // Consumers
    ...(queueInfrastructureDisabled
      ? testQueueProviders
      : [VideoUploadConsumer, SkillAnalysisConsumer]),

    // Processors
    ...(queueInfrastructureDisabled
      ? []
      : [
          UploadProcessor,
          ModerationProcessor,
          OutfieldPlayerProcessor,
          GoalkeeperProcessor,
          SkillScoringProcessor,
        ]),

    // Utils
    ...(queueInfrastructureDisabled ? [] : [ProgressTrackerService]),
  ],
  exports: [
    // Export producers for use in other modules
    VideoUploadProducer,
    SkillAnalysisProducer,
    ProgressTrackerService,
  ],
})
export class QueuesModule {}
