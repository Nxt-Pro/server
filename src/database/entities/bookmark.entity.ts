import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('bookmarks')
@Unique(['userId', 'bookmarkableId', 'bookmarkableType'])
@Index(['userId', 'createdAt'])
@Index(['bookmarkableType', 'bookmarkableId'])
@Index(['userId', 'bookmarkableType'])
export class Bookmark extends BaseEntity {
  @Column('char', { length: 26, name: 'user_id' })
  userId: string;

  @Column('char', { length: 26, name: 'bookmarkable_id' })
  bookmarkableId: string;

  @Column({
    type: 'enum',
    enum: ['post', 'player', 'scout', 'event'],
    name: 'bookmarkable_type',
  })
  bookmarkableType: 'post' | 'player' | 'scout' | 'event';

  @ManyToOne(() => User, user => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
