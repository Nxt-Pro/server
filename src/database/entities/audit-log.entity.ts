import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('audit_logs')
@Index('idx_audit_logs_actor_id', ['actor'])
@Index('idx_audit_logs_action', ['action'])
@Index('idx_audit_logs_entity_id', ['entityId'])
export class AuditLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({
    type: 'enum',
    enum: [
      'user_created',
      'user_updated',
      'user_banned',
      'user_suspended',
      'user_verified',
      'user_status_changed',
      'event_created',
      'event_updated',
      'event_deleted',
      'event_approved',
      'event_rejected',
      'event_status_changed',
      'registration_approved',
      'registration_rejected',
      'registration_cancelled',
      'report_created',
      'report_resolved',
      'report_dismissed',
      'admin_action',
      'system_event',
    ],
  })
  action:
    | 'user_created'
    | 'user_updated'
    | 'user_banned'
    | 'user_suspended'
    | 'user_verified'
    | 'user_status_changed'
    | 'event_created'
    | 'event_updated'
    | 'event_deleted'
    | 'event_approved'
    | 'event_rejected'
    | 'event_status_changed'
    | 'registration_approved'
    | 'registration_rejected'
    | 'registration_cancelled'
    | 'report_created'
    | 'report_resolved'
    | 'report_dismissed'
    | 'admin_action'
    | 'system_event';

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true, name: 'old_status' })
  oldStatus: string;

  @Column({ type: 'varchar', nullable: true, name: 'new_status' })
  newStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_agent' })
  userAgent: string;
}
