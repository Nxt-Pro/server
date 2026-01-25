import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Video } from './video.entity';

@Entity('video_skill_analysis')
@Index(['analysisVersion'])
@Index(['status', 'createdAt'])
export class VideoSkillAnalysis {
  @PrimaryColumn('char', {
    length: 26,
    name: 'video_id',
  })
  videoId: string;

  @Column({
    type: 'enum',
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  })
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @Column('jsonb', {
    nullable: false,
    default: {},
    name: 'ai_score',
  })
  aiScore: Record<string, unknown>;

  @Column('varchar', {
    length: 20,
    nullable: true,
    name: 'analysis_version',
  })
  analysisVersion?: string;

  @Column('timestamptz', {
    nullable: true,
    name: 'processed_at',
  })
  processedAt?: Date;

  @Column('text', {
    nullable: true,
    name: 'failure_reason',
  })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Video, video => video.skillAnalysis, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
