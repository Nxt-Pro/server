import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';

@Entity('likes')
@Unique(['userId', 'postId'])
@Index(['postId'])
@Index(['userId'])
@Index(['userId', 'postId'])
export class Like extends BaseEntity {
  @Column('char', {
    length: 26,
    name: 'user_id',
  })
  userId: string;

  @Column('char', {
    length: 26,
    name: 'post_id',
  })
  postId: string;

  // @ManyToOne(() => User, user => user.likes, {
  //   onDelete: 'CASCADE',
  // })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @ManyToOne(() => Post, post => post.likes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
