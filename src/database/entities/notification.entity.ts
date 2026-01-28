import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('notifications')
@Index('idx_notifications_read_at', ['read_at'])
@Index('idx_notifications_type', ['type'])
@Index('idx_notifications_user_created_at_desc', ['user', 'createdAt'])
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
    enum: [
      'like',
      'comment',
      'message',
      'connection_request',
      'verification',
      'marketing',
      'new_event',
    ],
  })
  type:
    | 'like'
    | 'comment'
    | 'message'
    | 'connection_request'
    | 'verification'
    | 'marketing'
    | 'new_event';

  @Column({ type: 'varchar', nullable: true, name: 'reference_id' })
  reference_id: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  read_at: Date | null;
}
