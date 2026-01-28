import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('favorites')
@Unique(['userId', 'favoritedId'])
@Index(['favoritedId', 'favoritedType'])
export class Favorite extends BaseEntity {
  @Column('char', { length: 26, name: 'user_id' })
  userId: string;

  @Column('char', { length: 26, name: 'favorited_id' })
  favoritedId: string;

  @Column({
    type: 'enum',
    enum: ['player', 'scout'],
    name: 'favorited_type',
  })
  favoritedType: 'player' | 'scout';

  @ManyToOne(() => User, user => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
