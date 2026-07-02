import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';
import { User } from './user.entity';
import type { AiErrorCode } from '@/integrations/ai/ai-error-normalizer';

export type AiSkillScoreJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

@Entity('ai_skill_score_jobs')
@Index(['playerId', 'skillKey', 'status'])
@Index(['requestedBy', 'createdAt'])
@Index(['queueJobId'])
export class AiSkillScoreJob extends BaseEntity {
  @Column('char', { length: 26, name: 'player_id' })
  playerId: string;

  @Column('char', { length: 26, name: 'requested_by' })
  requestedBy: string;

  @Column('varchar', { length: 100, nullable: true, name: 'queue_job_id' })
  queueJobId: string | null;

  @Column('varchar', { length: 50, name: 'skill_key' })
  skillKey: string;

  @Column('varchar', { length: 80, name: 'display_name' })
  displayName: string;

  @Column('varchar', { length: 50, name: 'profile_skill_key' })
  profileSkillKey: string;

  @Column('varchar', { length: 80, name: 'service_name' })
  serviceName: string;

  @Column({
    type: 'enum',
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  })
  status: AiSkillScoreJobStatus;

  @Column('jsonb', { nullable: false, default: {}, name: 'input' })
  input: Record<string, unknown>;

  @Column('jsonb', { nullable: true, name: 'result' })
  result: Record<string, unknown> | null;

  @Column('decimal', {
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'score',
  })
  score: number | null;

  @Column('decimal', {
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'confidence',
  })
  confidence: number | null;

  @Column('varchar', { length: 80, nullable: true, name: 'model_version' })
  modelVersion: string | null;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column('text', { nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'failure_code' })
  failureCode: AiErrorCode | null;

  @Column('jsonb', { nullable: true, name: 'failure_details' })
  failureDetails: Record<string, unknown> | null;

  @Column('boolean', { nullable: true, name: 'retryable' })
  retryable: boolean | null;

  @Column('timestamptz', { nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id', referencedColumnName: 'userId' })
  player: PlayerProfile;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by' })
  requestedByUser: User;
}
