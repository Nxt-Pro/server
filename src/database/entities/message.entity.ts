import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Chat } from './chat.entity';
import { User } from './user.entity';

@Entity('messages')
@Index('idx_messages_sender_id', ['sender'])
@Index('idx_messages_read_at', ['readAt'])
@Index('idx_messages_chat_created_at_desc', ['chat', 'createdAt'])
export class Message extends BaseEntity {
  @ManyToOne(() => Chat, chat => chat.messages)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'file', 'video'],
    default: 'text',
    name: 'message_type',
  })
  messageType: 'text' | 'image' | 'file' | 'video';

  @Column({ type: 'text', nullable: true, name: 'attachment_url' })
  attachmentUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;
}
