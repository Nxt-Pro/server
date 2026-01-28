import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('reports')
@Index('idx_reports_reported_type_id', ['reportedType', 'reportedId'])
@Index('idx_reports_status', ['status'])
export class Report extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({
    type: 'enum',
    enum: ['user', 'event', 'message', 'content', 'other'],
  })
  type: 'user' | 'event' | 'message' | 'content' | 'other';

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending',
  })
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'reported_type' })
  reportedType: string;

  @Column({ name: 'reported_id' })
  reportedId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolutionNotes: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>; // Additional context or evidence
}
