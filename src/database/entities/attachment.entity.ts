import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { MediaModeration } from './media-moderation.entity';
import { Post } from './post.entity';
import { Video } from './video.entity';

@Entity('attachments')
@Unique(['postId', 'position'])
@Index(['postId', 'position'])
export class Attachment extends BaseEntity {
  @Column('char', {
    length: 26,
    name: 'post_id',
  })
  postId: string;

  @Column({
    type: 'enum',
    enum: ['image', 'video'],
    name: 'content_type',
  })
  contentType: 'image' | 'video';

  @Column('varchar')
  url: string;

  @Column('integer')
  position: number;

  @ManyToOne(() => Post, post => post.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @OneToOne(() => Video, video => video.attachment, {
    nullable: true,
    cascade: true,
    onDelete: 'CASCADE',
  })
  video?: Video;

  @OneToOne(() => MediaModeration, moderation => moderation.attachment, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  mediaModeration: MediaModeration;
}
