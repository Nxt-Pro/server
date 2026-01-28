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
import { Attachment } from './attachment.entity';

@Entity('media_moderation')
@Index(['status', 'createdAt'])
export class MediaModeration {
  @PrimaryColumn('char', {
    length: 26,
    name: 'attachment_id',
  })
  attachmentId: string;

  @Column({
    type: 'enum',
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  })
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @Column('jsonb', { nullable: true })
  result: Record<string, unknown>;

  @Column('timestamptz', {
    nullable: true,
    name: 'processed_at',
  })
  processedAt: Date;

  @Column('text', {
    nullable: true,
    name: 'failure_reason',
  })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Attachment, attachment => attachment.mediaModeration, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attachment_id' })
  attachment: Attachment;
}
