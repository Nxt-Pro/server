import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { CommentsController } from './comments.controller';
import { PostsService } from './posts.service';
import {
  Attachment,
  Bookmark,
  Comment,
  Like,
  MediaModeration,
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
    ]),
  ],
  controllers: [PostsController, CommentsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
