import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryDeepPartialEntity, Repository } from 'typeorm';

import { BaseRepository } from './base.repository';

import { AiSkillScoreJob, AiSkillScoreJobStatus } from '@/database/entities';

const ACTIVE_STATUSES: AiSkillScoreJobStatus[] = ['queued', 'processing'];

@Injectable()
export class AiSkillScoreJobRepository extends BaseRepository<AiSkillScoreJob> {
  constructor(
    @InjectRepository(AiSkillScoreJob)
    repository: Repository<AiSkillScoreJob>,
  ) {
    super(repository);
  }

  async findActiveForSkill(
    playerId: string,
    skillKey: string,
  ): Promise<AiSkillScoreJob | null> {
    return this.repository.findOne({
      where: {
        playerId,
        skillKey,
        status: In(ACTIVE_STATUSES),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findVisibleJob(
    id: string,
    userId: string,
  ): Promise<AiSkillScoreJob | null> {
    return this.repository.findOne({
      where: [
        { id, playerId: userId },
        { id, requestedBy: userId },
      ],
    });
  }

  async listForUser(userId: string, limit = 25): Promise<AiSkillScoreJob[]> {
    return this.repository.find({
      where: [{ playerId: userId }, { requestedBy: userId }],
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async setQueueJobId(id: string, queueJobId: string): Promise<void> {
    await this.repository.update({ id }, { queueJobId });
  }

  async markProcessing(id: string, queueJobId: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        queueJobId,
        status: 'processing',
        failureReason: null,
      },
    );
  }

  async markCompleted(
    id: string,
    data: {
      score: number;
      confidence: number | null;
      summary: string | null;
      modelVersion: string | null;
      result: Record<string, unknown>;
    },
  ): Promise<void> {
    const update: QueryDeepPartialEntity<AiSkillScoreJob> = {
      status: 'completed',
      score: data.score,
      confidence: data.confidence,
      summary: data.summary,
      modelVersion: data.modelVersion,
      result: data.result as QueryDeepPartialEntity<Record<string, unknown>>,
      completedAt: new Date(),
      failureReason: null,
    };

    await this.repository.update({ id }, update);
  }

  async markFailed(id: string, failureReason: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        status: 'failed',
        failureReason,
        completedAt: new Date(),
      },
    );
  }
}
