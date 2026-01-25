import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Attachment } from './attachment.entity';
import { BaseEntity } from './base.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { User } from './user.entity';

@Entity('posts')
@Index(['userId', 'createdAt'])
@Index(['visibility', 'engagementScore', 'createdAt'])
@Index(['visibility', 'isHighlight', 'createdAt'])
export class Post extends BaseEntity {
  @Column('char', { length: 26, name: 'user_id' })
  userId: string;

  @Column('text', { nullable: true })
  caption: string;

  @Column('boolean', {
    default: false,
    name: 'is_highlight',
  })
  isHighlight: boolean;

  @Column('float', {
    default: 0,
    name: 'engagement_score',
  })
  engagementScore: number;

  @Column('integer', {
    default: 0,
    name: 'likes_count',
  })
  likesCount: number;

  @Column('integer', {
    default: 0,
    name: 'comments_count',
  })
  commentsCount: number;

  @Column('integer', {
    default: 0,
    name: 'views_count',
  })
  viewsCount: number;

  @Column('integer', {
    default: 0,
    name: 'shares_count',
  })
  sharesCount: number;

  @Column({
    type: 'enum',
    enum: ['public', 'connections', 'private'],
    default: 'public',
  })
  visibility: 'public' | 'connections' | 'private';

  @Column('boolean', {
    default: false,
    name: 'is_reported',
  })
  isReported: boolean;

  @ManyToOne(() => User, user => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Attachment, attachment => attachment.post, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  attachments: Attachment[];

  @OneToMany(() => Like, like => like.post, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  likes: Like[];

  @OneToMany(() => Comment, comment => comment.post, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  comments: Comment[];
}
