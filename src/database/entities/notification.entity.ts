import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export const NOTIFICATION_TYPES = [
  'like',
  'comment',
  'message',
  'connection_request',
  'verification',
  'marketing',
  'new_event',
  'skill_score',
  'chat_request',
  'chat_message',
  'chat_accepted',
  'connection_accepted',
  'connection_rejected',
  'post_like',
  'post_comment',
  'post_share',
  'event_created',
  'event_updated',
  'event_registration',
  'verification_status',
  'report_status',
  'admin_action',
  'system',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationReferenceType =
  | 'chat'
  | 'connection'
  | 'event'
  | 'post'
  | 'profile'
  | 'report'
  | 'skill_score_job'
  | 'system'
  | 'user';

export type NotificationData = Record<string, string | number | boolean | null>;

@Entity('notifications')
@Index('idx_notifications_read_at', ['readAt'])
@Index('idx_notifications_type', ['type'])
@Index('idx_notifications_user_created_at_desc', ['user', 'createdAt'])
@Index('idx_notifications_reference', ['referenceType', 'referenceId'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NOTIFICATION_TYPES,
  })
  type: NotificationType;

  @Column({ type: 'varchar', nullable: true, name: 'reference_id' })
  referenceId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'reference_type' })
  referenceType: NotificationReferenceType | null;

  @Column({ type: 'jsonb', nullable: true })
  data: NotificationData | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;
}
