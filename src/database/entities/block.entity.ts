import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('blocks')
@Unique(['blockerId', 'blockedId'])
@Index(['blockedId'])
export class Block extends BaseEntity {
  @Column('char', { length: 26, name: 'blocker_id' })
  blockerId: string;

  @Column('char', { length: 26, name: 'blocked_id' })
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;
}
