import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import {
  Attachment,
  Block,
  Bookmark,
  Comment,
  Like,
  MediaModeration,
  Mute,
  Post,
  Report,
  User,
  Video,
} from '@/database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Attachment,
      Like,
      Comment,
      Bookmark,
      User,
      MediaModeration,
      Video,
      Report,
      Block,
      Mute,
    ]),
  ],
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
