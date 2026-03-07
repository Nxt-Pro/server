import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AddAttachmentDto,
  CreateAiVideoDto,
  CreateCommentDto,
  CreatePostDto,
  ReportPostDto,
  UpdateVideoDto,
} from './dto';
import { PostsService } from './posts.service';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('post')
export class PostsController {
  private readonly postsService: PostsService;

  constructor(postsService: PostsService) {
    this.postsService = postsService;
  }

  @Post()
  createPost(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(user.sub, dto);
  }

  @Post('ai-video')
  createAiVideo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAiVideoDto,
  ) {
    return this.postsService.createAiVideo(user.sub, dto);
  }

  @Post(':id/attachment')
  addAttachment(
    @Param('id') postId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddAttachmentDto,
  ) {
    return this.postsService.addAttachment(postId, user.sub, dto);
  }

  @Get('videos')
  listVideos(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('mine') mine?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(
      50,
      Math.max(1, parseInt(limit || '20', 10) || 20),
    );
    const filterByUser = mine !== 'false' && mine !== '0';
    return this.postsService.listVideos(
      user.sub,
      pageNum,
      limitNum,
      filterByUser,
    );
  }

  @Get('videos/:id')
  getVideo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.getVideo(id, user.sub);
  }

  @Patch('videos/:id')
  updateVideo(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.postsService.updateVideo(id, user.sub, dto);
  }

  @Delete('videos/:id')
  async deleteVideo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.postsService.deleteVideo(id, user.sub);
    return { message: 'Video deleted' };
  }

  @Get('fyp')
  getFyp(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getFypFeed(user.sub, page, limit);
  }

  @Get('highlights')
  getHighlights(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getHighlightsFeed(user.sub, page, limit);
  }

  @Get('trending')
  getTrending(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getTrendingFeed(user.sub, page, limit);
  }

  @Delete(':id')
  async deletePost(
    @Param('id') postId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.postsService.deletePost(postId, user.sub);
    return { message: 'Post deleted' };
  }

  @Get(':id')
  getPost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.getPost(postId, user.sub);
  }

  @Post(':id/like')
  likePost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.likePost(postId, user.sub);
  }

  @Delete(':id/like')
  unlikePost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.unlikePost(postId, user.sub);
  }

  @Get(':id/comments')
  getComments(
    @Param('id') postId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getComments(postId, user.sub, page, limit);
  }

  @Post(':id/comment')
  createComment(
    @Param('id') postId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, user.sub, dto);
  }

  @Post(':id/bookmark')
  bookmarkPost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.bookmarkPost(postId, user.sub);
  }

  @Delete(':id/bookmark')
  unbookmarkPost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.unbookmarkPost(postId, user.sub);
  }

  @Post(':id/share')
  sharePost(@Param('id') postId: string, @CurrentUser() user: JwtPayload) {
    return this.postsService.sharePost(postId, user.sub);
  }

  @Post('report')
  reportPost(@CurrentUser() user: JwtPayload, @Body() dto: ReportPostDto) {
    return this.postsService.reportPost(user.sub, dto);
  }
}
