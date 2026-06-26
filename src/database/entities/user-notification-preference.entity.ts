import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('user_notification_preferences')
@Index('idx_user_notification_preferences_user_id', ['user'], { unique: true })
export class UserNotificationPreference extends BaseEntity {
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true, name: 'in_app_notifications' })
  inAppNotifications: boolean;

  @Column({ type: 'boolean', default: true, name: 'email_notifications' })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true, name: 'chat_requests' })
  chatRequests: boolean;

  @Column({ type: 'boolean', default: true, name: 'chat_messages' })
  chatMessages: boolean;

  @Column({ type: 'boolean', default: true, name: 'chat_accepted' })
  chatAccepted: boolean;

  @Column({ type: 'boolean', default: true })
  connections: boolean;

  @Column({ type: 'boolean', default: true, name: 'post_engagement' })
  postEngagement: boolean;

  @Column({ type: 'boolean', default: true, name: 'event_updates' })
  eventUpdates: boolean;

  @Column({ type: 'boolean', default: true, name: 'verification_updates' })
  verificationUpdates: boolean;
}
