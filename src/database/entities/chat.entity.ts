import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChatParticipant } from './chat-participant.entity';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('chats')
@Unique(['player', 'scout'])
@Index('idx_chats_scout_id', ['scout'])
@Index('idx_chats_last_message_at_desc', ['lastMessageAt'])
export class Chat extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ['direct', 'group'],
    default: 'direct',
  })
  type: 'direct' | 'group';

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scout_id' })
  scout: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'archived', 'blocked'],
    default: 'pending',
  })
  status: 'pending' | 'active' | 'archived' | 'blocked';

  @Column({ type: 'int', default: 0, name: 'unread_count' })
  unreadCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
  lastMessageAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'last_message_preview' })
  lastMessagePreview: string | null;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @OneToMany(() => ChatParticipant, participant => participant.chat)
  participants: ChatParticipant[];

  @OneToMany(() => Message, message => message.chat)
  messages: Message[];
}
