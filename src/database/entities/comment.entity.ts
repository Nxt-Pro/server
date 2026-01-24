import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';

@Entity('comments')
@Index(['postId', 'createdAt'])
@Index(['parentComment', 'createdAt'])
@Index(['userId'])
export class Comment extends BaseEntity {
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

  @Column('char', {
    length: 26,
    nullable: true,
    name: 'parent_comment',
  })
  parentComment?: string;

  @Column('text')
  content: string;

  @Column('boolean', {
    default: false,
    name: 'is_reported',
  })
  isReported: boolean;

  // @ManyToOne(() => User, user => user.comments, {
  //   onDelete: 'CASCADE',
  // })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @ManyToOne(() => Post, post => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => Comment, comment => comment.replies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_comment' })
  parent?: Comment;

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];
}
