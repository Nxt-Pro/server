import { Controller, Delete, Param } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('comment')
export class CommentsController {
  private readonly postsService: PostsService;

  constructor(postsService: PostsService) {
    this.postsService = postsService;
  }

  @Delete(':id')
  deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.deleteComment(commentId, user.sub);
  }
}
