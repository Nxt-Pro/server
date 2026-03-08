import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Chat } from './chat.entity';
import { User } from './user.entity';

@Entity('chat_participants')
export class ChatParticipant extends BaseEntity {
  @ManyToOne(() => Chat, chat => chat.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0, name: 'unread_count' })
  unreadCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'archived', 'blocked'],
    default: 'pending',
  })
  status: 'pending' | 'active' | 'archived' | 'blocked';
}
