import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('mutes')
@Unique(['muterId', 'mutedId'])
@Index(['mutedId'])
export class Mute extends BaseEntity {
  @Column('char', { length: 26, name: 'muter_id' })
  muterId: string;

  @Column('char', { length: 26, name: 'muted_id' })
  mutedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'muter_id' })
  muter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'muted_id' })
  muted: User;
}
