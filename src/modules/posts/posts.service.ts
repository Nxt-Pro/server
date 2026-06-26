import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type {
  AddAttachmentDto,
  AiVideoResponseDto,
  AttachmentResponseDto,
  BookmarkResponseDto,
  CommentResponseDto,
  CreateAiVideoDto,
  CreateCommentDto,
  CreatePostDto,
  LikeResponseDto,
  PaginatedCommentsDto,
  PaginatedPostsDto,
  PaginatedVideosDto,
  PostResponseDto,
  ReportPostDto,
  ShareResponseDto,
  UpdatePostDto,
  UpdateVideoDto,
  VideoResponseDto,
} from './dto';

import { MediaUrlService } from '@/common/media';
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

@Injectable()
export class PostsService {
  private readonly postRepository: Repository<Post>;
  private readonly attachmentRepository: Repository<Attachment>;
  private readonly likeRepository: Repository<Like>;
  private readonly commentRepository: Repository<Comment>;
  private readonly bookmarkRepository: Repository<Bookmark>;
  private readonly userRepository: Repository<User>;
  private readonly mediaModerationRepository: Repository<MediaModeration>;
  private readonly videoRepository: Repository<Video>;
  private readonly reportRepository: Repository<Report>;
  private readonly blockRepository: Repository<Block>;
  private readonly muteRepository: Repository<Mute>;

  constructor(
    @InjectRepository(Post)
    postRepository: Repository<Post>,
    @InjectRepository(Attachment)
    attachmentRepository: Repository<Attachment>,
    @InjectRepository(Like)
    likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    commentRepository: Repository<Comment>,
    @InjectRepository(Bookmark)
    bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(User)
    userRepository: Repository<User>,
    @InjectRepository(MediaModeration)
    mediaModerationRepository: Repository<MediaModeration>,
    @InjectRepository(Video)
    videoRepository: Repository<Video>,
    @InjectRepository(Report)
    reportRepository: Repository<Report>,
    @InjectRepository(Block)
    blockRepository: Repository<Block>,
    @InjectRepository(Mute)
    muteRepository: Repository<Mute>,
    private readonly mediaUrlService: MediaUrlService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.postRepository = postRepository;
    this.attachmentRepository = attachmentRepository;
    this.likeRepository = likeRepository;
    this.commentRepository = commentRepository;
    this.bookmarkRepository = bookmarkRepository;
    this.userRepository = userRepository;
    this.mediaModerationRepository = mediaModerationRepository;
    this.videoRepository = videoRepository;
    this.reportRepository = reportRepository;
    this.blockRepository = blockRepository;
    this.muteRepository = muteRepository;
  }

  async reportPost(
    userId: string,
    dto: ReportPostDto,
  ): Promise<{ message: string }> {
    await this.ensurePostExists(dto.postId);
    const report = this.reportRepository.create({
      reporter: { id: userId },
      type: 'content',
      title: dto.title,
      description: dto.description ?? dto.title,
      reportedType: 'post',
      reportedId: dto.postId,
    });
    await this.reportRepository.save(report);
    await this.postRepository.update({ id: dto.postId }, { isReported: true });
    return { message: 'Report submitted' };
  }

  async createPost(
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    const createdPost = await this.postRepository.manager.transaction(
      async manager => {
        const post = manager.getRepository(Post).create({
          userId,
          caption: dto.caption ?? undefined,
          visibility: dto.visibility ?? 'public',
          ...this.normalizeMusicCreateInput(dto),
        });
        await manager.getRepository(Post).save(post);

        const mediaUrls = (dto.mediaUrls ?? [])
          .map(url => url.trim())
          .filter(Boolean)
          .slice(0, 10);

        for (const [position, url] of mediaUrls.entries()) {
          this.ensureDurableMediaUrl(url);
          const contentType = this.inferAttachmentType(url);

          const attachment = manager.getRepository(Attachment).create({
            postId: post.id,
            contentType,
            url,
            position,
          });
          await manager.getRepository(Attachment).save(attachment);

          if (contentType === 'video') {
            const mediaModeration = manager
              .getRepository(MediaModeration)
              .create({
                attachmentId: attachment.id,
                status: 'queued',
              });
            await manager.getRepository(MediaModeration).save(mediaModeration);

            const video = manager.getRepository(Video).create({
              id: attachment.id,
              videoDuration: 0,
            });
            await manager.getRepository(Video).save(video);
          }
        }

        return manager.getRepository(Post).findOne({
          where: { id: post.id },
          relations: [
            'attachments',
            'attachments.video',
            'user',
            'user.playerProfile',
            'user.scoutProfile',
          ],
        });
      },
    );

    if (!createdPost) {
      throw new NotFoundException('Post not found');
    }

    return this.toPostResponse(createdPost);
  }

  async updatePost(
    postId: string,
    userId: string,
    dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: [
        'attachments',
        'attachments.video',
        'user',
        'user.playerProfile',
        'user.scoutProfile',
      ],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    if (dto.caption !== undefined) {
      post.caption = dto.caption?.trim() || null;
    }

    if (dto.visibility !== undefined) {
      post.visibility = dto.visibility;
    }

    this.applyMusicUpdate(post, dto);

    const saved = await this.postRepository.save(post);
    return this.toPostResponse(saved);
  }

  async createAiVideo(
    userId: string,
    dto: CreateAiVideoDto,
  ): Promise<AiVideoResponseDto> {
    const post = this.postRepository.create({
      userId,
      visibility: 'private',
    });
    await this.postRepository.save(post);

    const attachment = this.attachmentRepository.create({
      postId: post.id,
      contentType: 'video',
      url: dto.url,
      position: 0,
    });
    await this.attachmentRepository.save(attachment);

    const mediaModeration = this.mediaModerationRepository.create({
      attachmentId: attachment.id,
      status: 'queued',
    });
    await this.mediaModerationRepository.save(mediaModeration);

    const video = this.videoRepository.create({
      id: attachment.id,
      videoDuration: dto.videoDuration ?? 0,
      videoThumbnailUrl: dto.videoThumbnailUrl ?? undefined,
    });
    await this.videoRepository.save(video);

    return {
      id: video.id,
      post_id: post.id,
      url: this.resolveMediaUrl(attachment.url) ?? attachment.url,
      video_thumbnail_url: this.resolveMediaUrl(video.videoThumbnailUrl),
      video_duration: video.videoDuration,
      title: post.caption ?? '',
      views_count: post.viewsCount ?? 0,
      caption: post.caption ?? undefined,
      visibility: post.visibility,
      user_id: post.userId,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    };
  }

  async addAttachment(
    postId: string,
    userId: string,
    dto: AddAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    await this.ensurePostOwned(postId, userId);

    let nextPosition = dto.position;
    if (nextPosition === undefined) {
      const result = await this.attachmentRepository
        .createQueryBuilder('a')
        .select('MAX(a.position)', 'max')
        .where('a.postId = :postId', { postId })
        .getRawOne<{ max: string | null }>();
      const maxVal = result?.max != null ? Number(result.max) : -1;
      nextPosition = maxVal + 1;
    }

    const attachment = this.attachmentRepository.create({
      postId,
      contentType: dto.contentType,
      url: this.ensureDurableMediaUrl(dto.url),
      position: nextPosition,
    });
    await this.attachmentRepository.save(attachment);

    if (dto.contentType === 'video') {
      const mediaModeration = this.mediaModerationRepository.create({
        attachmentId: attachment.id,
        status: 'queued',
      });
      await this.mediaModerationRepository.save(mediaModeration);

      const video = this.videoRepository.create({
        id: attachment.id,
        videoDuration: dto.videoDuration ?? 0,
        videoThumbnailUrl: dto.videoThumbnailUrl ?? undefined,
      });
      await this.videoRepository.save(video);
    }

    const saved = await this.attachmentRepository.findOne({
      where: { id: attachment.id },
      relations: ['video'],
    });
    return this.toAttachmentResponse(saved ?? attachment);
  }

  async getFypFeed(
    userId: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedPostsDto> {
    const hiddenUserIds = userId ? await this.getHiddenUserIds(userId) : [];

    const qb = this.postRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.attachments', 'a')
      .leftJoinAndSelect('a.video', 'v')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('u.playerProfile', 'upp')
      .leftJoinAndSelect('u.scoutProfile', 'usp')
      .where('p.visibility = :visibility', { visibility: 'public' })
      .orderBy('p.engagementScore', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    if (hiddenUserIds.length > 0) {
      qb.andWhere('p.userId NOT IN (:...hiddenUserIds)', { hiddenUserIds });
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await this.toPostResponses(posts, userId);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listPosts(
    userId: string | undefined,
    page: number,
    limit: number,
    onlyMine = true,
    targetUserId?: string,
  ): Promise<PaginatedPostsDto> {
    const hiddenUserIds = userId ? await this.getHiddenUserIds(userId) : [];

    const qb = this.postRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.attachments', 'a')
      .leftJoinAndSelect('a.video', 'v')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('u.playerProfile', 'upp')
      .leftJoinAndSelect('u.scoutProfile', 'usp')
      .orderBy('p.createdAt', 'DESC');

    if (targetUserId) {
      qb.where('p.userId = :targetUserId', { targetUserId });
      if (targetUserId !== userId) {
        qb.andWhere('p.visibility = :publicVisibility', {
          publicVisibility: 'public',
        });
      }
      if (hiddenUserIds.includes(targetUserId)) {
        qb.andWhere('1 = 0');
      }
    } else if (onlyMine && userId) {
      qb.where('p.userId = :userId', { userId });
    } else if (!userId) {
      qb.where('p.visibility = :publicVisibility', {
        publicVisibility: 'public',
      });
    } else {
      qb.where('(p.visibility = :publicVisibility OR p.userId = :userId)', {
        publicVisibility: 'public',
        userId,
      });

      if (hiddenUserIds.length > 0) {
        qb.andWhere('p.userId NOT IN (:...hiddenUserIds)', { hiddenUserIds });
      }
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await this.toPostResponses(posts, userId);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getHighlightsFeed(
    userId: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedPostsDto> {
    const hiddenUserIds = userId ? await this.getHiddenUserIds(userId) : [];

    const qb = this.postRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.attachments', 'a')
      .leftJoinAndSelect('a.video', 'v')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('u.playerProfile', 'upp')
      .leftJoinAndSelect('u.scoutProfile', 'usp')
      .where('p.isHighlight = :isHighlight', { isHighlight: true })
      .andWhere('p.visibility = :visibility', { visibility: 'public' })
      .orderBy('p.createdAt', 'DESC');

    if (hiddenUserIds.length > 0) {
      qb.andWhere('p.userId NOT IN (:...hiddenUserIds)', { hiddenUserIds });
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await this.toPostResponses(posts, userId);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getTrendingFeed(
    userId: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedPostsDto> {
    const hiddenUserIds = userId ? await this.getHiddenUserIds(userId) : [];

    const qb = this.postRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.attachments', 'a')
      .leftJoinAndSelect('a.video', 'v')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('u.playerProfile', 'upp')
      .leftJoinAndSelect('u.scoutProfile', 'usp')
      .where('p.visibility = :visibility', { visibility: 'public' })
      .orderBy('p.engagementScore', 'DESC')
      .addOrderBy('p.viewsCount', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    if (hiddenUserIds.length > 0) {
      qb.andWhere('p.userId NOT IN (:...hiddenUserIds)', { hiddenUserIds });
    }

    const [posts, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await this.toPostResponses(posts, userId);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.postRepository.remove(post);
  }

  async getPost(
    postId: string,
    userId: string | undefined,
  ): Promise<PostResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: [
        'user',
        'user.playerProfile',
        'user.scoutProfile',
        'attachments',
        'attachments.video',
      ],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.visibility === 'private' && post.userId !== userId) {
      throw new NotFoundException('Post not found');
    }
    await this.postRepository.increment({ id: postId }, 'viewsCount', 1);
    post.viewsCount += 1;
    const [response] = await this.toPostResponses([post], userId);
    return response;
  }

  async listBookmarkedPosts(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedPostsDto> {
    const [bookmarks, total] = await this.bookmarkRepository.findAndCount({
      where: { userId, bookmarkableType: 'post' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const postIds = bookmarks.map(bookmark => bookmark.bookmarkableId);
    if (postIds.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const posts = await this.postRepository.find({
      where: { id: In(postIds) },
      relations: [
        'user',
        'user.playerProfile',
        'user.scoutProfile',
        'attachments',
        'attachments.video',
      ],
    });
    const postsById = new Map(posts.map(post => [post.id, post]));
    const visiblePosts = postIds
      .map(id => postsById.get(id))
      .filter(
        (
          post,
        ): post is Post & {
          attachments?: (Attachment & { video?: Video })[];
        } =>
          Boolean(post) &&
          (post!.visibility !== 'private' || post!.userId === userId),
      );

    return {
      data: await this.toPostResponses(visiblePosts, userId),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async likePost(postId: string, userId: string): Promise<LikeResponseDto> {
    const existingPost = await this.ensurePostExists(postId);
    const existing = await this.likeRepository.findOne({
      where: { postId, userId },
    });
    if (existing) {
      const post = await this.postRepository.findOne({ where: { id: postId } });
      return { liked: true, likesCount: post?.likesCount ?? 0 };
    }
    await this.likeRepository.save(
      this.likeRepository.create({ postId, userId }),
    );
    await this.postRepository.increment({ id: postId }, 'likesCount', 1);
    const post = await this.postRepository.findOne({ where: { id: postId } });
    await this.notifyPostLiked(existingPost, userId);
    return { liked: true, likesCount: post?.likesCount ?? 0 };
  }

  async unlikePost(postId: string, userId: string): Promise<LikeResponseDto> {
    const result = await this.likeRepository.delete({ postId, userId });
    if (result.affected && result.affected > 0) {
      await this.postRepository.decrement({ id: postId }, 'likesCount', 1);
    }
    const post = await this.postRepository.findOne({ where: { id: postId } });
    return { liked: false, likesCount: post?.likesCount ?? 0 };
  }

  async getComments(
    postId: string,
    userId: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedCommentsDto> {
    await this.ensurePostVisible(postId, userId);
    const [comments, total] = await this.commentRepository.findAndCount({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = comments.map(c => this.toCommentResponse(c));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const post = await this.ensurePostVisible(postId, userId);
    const comment = this.commentRepository.create({
      postId,
      userId,
      content: dto.content,
      parentComment: dto.parentCommentId ?? undefined,
    });
    await this.commentRepository.save(comment);
    await this.postRepository.increment({ id: postId }, 'commentsCount', 1);
    await this.notifyPostCommented(post, userId, dto.content);
    return this.toCommentResponse(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Allow deletion by comment author OR post owner
    if (comment.userId !== userId) {
      const post = await this.postRepository.findOne({
        where: { id: comment.postId },
      });
      if (!post || post.userId !== userId) {
        throw new ForbiddenException(
          'You can only delete your own comments or comments on your posts',
        );
      }
    }

    await this.commentRepository.remove(comment);
    await this.postRepository.decrement(
      { id: comment.postId },
      'commentsCount',
      1,
    );
  }

  async bookmarkPost(
    postId: string,
    userId: string,
  ): Promise<BookmarkResponseDto> {
    await this.ensurePostExists(postId);
    const existing = await this.bookmarkRepository.findOne({
      where: { userId, bookmarkableId: postId, bookmarkableType: 'post' },
    });
    if (existing) {
      return { bookmarked: true };
    }
    await this.bookmarkRepository.save(
      this.bookmarkRepository.create({
        userId,
        bookmarkableId: postId,
        bookmarkableType: 'post',
      }),
    );
    return { bookmarked: true };
  }

  async unbookmarkPost(
    postId: string,
    userId: string,
  ): Promise<BookmarkResponseDto> {
    await this.bookmarkRepository.delete({
      userId,
      bookmarkableId: postId,
      bookmarkableType: 'post',
    });
    return { bookmarked: false };
  }

  async sharePost(postId: string, userId: string): Promise<ShareResponseDto> {
    await this.ensurePostVisible(postId, userId);
    await this.postRepository.increment({ id: postId }, 'sharesCount', 1);
    const post = await this.postRepository.findOne({ where: { id: postId } });
    return { sharesCount: post?.sharesCount ?? 1 };
  }

  async getVideo(id: string, userId?: string): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['attachment', 'attachment.post'],
    });
    if (!video?.attachment?.post) {
      throw new NotFoundException('Video not found');
    }
    const post = video.attachment.post;
    if (userId && post.userId !== userId) {
      if (post.visibility === 'private') {
        throw new NotFoundException('Video not found');
      }
    }
    return this.toVideoResponse(video, video.attachment, post);
  }

  async listVideos(
    userId: string,
    page = 1,
    limit = 20,
    filterByUser = true,
  ): Promise<PaginatedVideosDto> {
    const qb = this.videoRepository
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.attachment', 'a')
      .innerJoinAndSelect('a.post', 'p')
      .orderBy('p.createdAt', 'DESC');

    if (filterByUser) {
      qb.andWhere('p.userId = :userId', { userId });
    }

    const [videos, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = videos.map(v =>
      this.toVideoResponse(v, v.attachment, v.attachment.post),
    );
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateVideo(
    id: string,
    userId: string,
    dto: UpdateVideoDto,
  ): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['attachment', 'attachment.post'],
    });
    if (!video?.attachment?.post) {
      throw new NotFoundException('Video not found');
    }
    if (video.attachment.post.userId !== userId) {
      throw new ForbiddenException('You can only update your own videos');
    }

    if (dto.url !== undefined) {
      video.attachment.url = this.ensureDurableMediaUrl(dto.url);
      await this.attachmentRepository.save(video.attachment);
    }
    if (dto.videoDuration !== undefined) {
      video.videoDuration = dto.videoDuration;
    }
    if (dto.videoThumbnailUrl !== undefined) {
      video.videoThumbnailUrl = dto.videoThumbnailUrl;
    }
    await this.videoRepository.save(video);

    if (dto.caption !== undefined || dto.visibility !== undefined) {
      const post = video.attachment.post;
      if (dto.caption !== undefined) post.caption = dto.caption;
      if (dto.visibility !== undefined) post.visibility = dto.visibility;
      await this.postRepository.save(post);
    }

    const updated = await this.videoRepository.findOne({
      where: { id },
      relations: ['attachment', 'attachment.post'],
    });
    return this.toVideoResponse(
      updated!,
      updated!.attachment,
      updated!.attachment.post,
    );
  }

  async deleteVideo(id: string, userId: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['attachment', 'attachment.post'],
    });
    if (!video?.attachment?.post) {
      throw new NotFoundException('Video not found');
    }
    if (video.attachment.post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own videos');
    }
    await this.postRepository.remove(video.attachment.post);
  }

  private toVideoResponse(
    video: Video,
    attachment: Attachment,
    post: Post,
  ): VideoResponseDto {
    return {
      id: video.id,
      post_id: post.id,
      url: this.resolveMediaUrl(attachment.url) ?? attachment.url,
      video_thumbnail_url: this.resolveMediaUrl(video.videoThumbnailUrl),
      video_duration: video.videoDuration,
      title: post.caption ?? '',
      views_count: post.viewsCount ?? 0,
      caption: post.caption ?? undefined,
      visibility: post.visibility,
      user_id: post.userId,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    };
  }

  private async ensurePostOwned(postId: string, userId: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException(
        'You can only add attachments to your own posts',
      );
    }
    return post;
  }

  /**
   * Returns IDs of users that the given user has blocked or muted.
   * Used to filter those users' posts out of feeds.
   */
  private async getHiddenUserIds(userId: string): Promise<string[]> {
    const [blocks, mutes] = await Promise.all([
      this.blockRepository.find({
        where: { blockerId: userId },
        select: ['blockedId'],
      }),
      this.muteRepository.find({
        where: { muterId: userId },
        select: ['mutedId'],
      }),
    ]);
    const ids = new Set([
      ...blocks.map(b => b.blockedId),
      ...mutes.map(m => m.mutedId),
    ]);
    return [...ids];
  }

  private async ensurePostExists(postId: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private async ensurePostVisible(
    postId: string,
    userId: string | undefined,
  ): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.visibility === 'private' && post.userId !== userId) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private inferAttachmentType(url: string): 'image' | 'video' {
    const normalized = url.toLowerCase();
    const isVideo = /(\.mp4|\.mov|\.webm|\.mkv|\.avi)(\?|#|$)/.test(normalized);
    return isVideo ? 'video' : 'image';
  }

  private normalizeMusicCreateInput(
    dto: CreatePostDto,
  ): Partial<
    Pick<Post, 'musicUrl' | 'musicTitle' | 'musicArtist' | 'musicDurationMs'>
  > {
    const hasMusicMetadata =
      dto.musicTitle !== undefined ||
      dto.musicArtist !== undefined ||
      dto.musicDurationMs !== undefined;

    if (dto.musicUrl == null || String(dto.musicUrl).trim() === '') {
      if (hasMusicMetadata) {
        throw new BadRequestException(
          'Music URL is required when music metadata is provided.',
        );
      }

      return {};
    }

    const musicUrl = this.ensureAudioMediaUrl(dto.musicUrl);

    return {
      musicUrl,
      musicTitle: this.normalizeNullableString(dto.musicTitle),
      musicArtist: this.normalizeNullableString(dto.musicArtist),
      musicDurationMs: this.normalizeNullableDuration(dto.musicDurationMs),
    };
  }

  private applyMusicUpdate(post: Post, dto: UpdatePostDto): void {
    if (
      dto.musicUrl === undefined &&
      dto.musicTitle === undefined &&
      dto.musicArtist === undefined &&
      dto.musicDurationMs === undefined
    ) {
      return;
    }

    if (dto.musicUrl === null || dto.musicUrl === '') {
      post.musicUrl = null;
      post.musicTitle = null;
      post.musicArtist = null;
      post.musicDurationMs = null;
      return;
    }

    if (dto.musicUrl !== undefined) {
      post.musicUrl = this.ensureAudioMediaUrl(dto.musicUrl);
    }

    if (!post.musicUrl) {
      throw new BadRequestException(
        'Music URL is required when music metadata is provided.',
      );
    }

    if (dto.musicTitle !== undefined) {
      post.musicTitle = this.normalizeNullableString(dto.musicTitle);
    }
    if (dto.musicArtist !== undefined) {
      post.musicArtist = this.normalizeNullableString(dto.musicArtist);
    }
    if (dto.musicDurationMs !== undefined) {
      post.musicDurationMs = this.normalizeNullableDuration(
        dto.musicDurationMs,
      );
    }
  }

  private normalizeNullableString(
    value: string | null | undefined,
  ): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNullableDuration(
    value: number | null | undefined,
  ): number | null {
    if (value == null) return null;
    const duration = Number(value);
    if (!Number.isFinite(duration) || duration < 0) {
      throw new BadRequestException('Music duration must be zero or greater.');
    }
    return Math.round(duration);
  }

  private ensureAudioMediaUrl(url: string): string {
    const normalized = this.ensureDurableMediaUrl(url);
    if (!/\.(mp3|m4a|aac|wav|ogg|oga|flac|webm)(\?|#|$)/i.test(normalized)) {
      throw new BadRequestException(
        'Music URL must point to a supported audio file.',
      );
    }
    return normalized;
  }

  private ensureDurableMediaUrl(url: string): string {
    const normalized = url.trim();

    if (!normalized) {
      throw new BadRequestException('Media URL is required.');
    }

    if (/^(file|content|blob|data|ph|assets-library|expo):/i.test(normalized)) {
      throw new BadRequestException(
        'Media must be uploaded before creating a post.',
      );
    }

    if (/ExponentExperienceData|ImagePicker|Caches|cache/i.test(normalized)) {
      throw new BadRequestException(
        'Media must be uploaded before creating a post.',
      );
    }

    return normalized;
  }

  private async toPostResponses(
    posts: (Post & { attachments?: (Attachment & { video?: Video })[] })[],
    userId: string | undefined,
  ): Promise<PostResponseDto[]> {
    const postIds = posts.map(post => post.id);
    if (postIds.length === 0) return [];

    if (!userId) {
      return posts.map(post =>
        this.toPostResponse(post, {
          isLiked: false,
          isBookmarked: false,
        }),
      );
    }

    const [likes, bookmarks] = await Promise.all([
      this.likeRepository.find({
        where: { userId, postId: In(postIds) },
        select: ['postId'],
      }),
      this.bookmarkRepository.find({
        where: {
          userId,
          bookmarkableType: 'post',
          bookmarkableId: In(postIds),
        },
        select: ['bookmarkableId'],
      }),
    ]);

    const likedPostIds = new Set(likes.map(like => like.postId));
    const bookmarkedPostIds = new Set(
      bookmarks.map(bookmark => bookmark.bookmarkableId),
    );

    return posts.map(post =>
      this.toPostResponse(post, {
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
      }),
    );
  }

  private toPostResponse(
    post: Post & {
      attachments?: (Attachment & { video?: Video })[];
      user?: User;
    },
    engagement: { isLiked?: boolean; isBookmarked?: boolean } = {},
  ): PostResponseDto {
    const attachments = post.attachments
      ?.slice()
      .sort((a, b) => a.position - b.position)
      .map(a => this.toAttachmentResponse(a));
    return {
      id: post.id,
      userId: post.userId,
      author: this.toPostAuthorResponse(post.user),
      caption: post.caption ?? null,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.viewsCount,
      sharesCount: post.sharesCount,
      isLiked: engagement.isLiked ?? false,
      isBookmarked: engagement.isBookmarked ?? false,
      visibility: post.visibility,
      isHighlight: post.isHighlight,
      music: post.musicUrl
        ? {
            url: this.resolveMediaUrl(post.musicUrl) ?? post.musicUrl,
            title: post.musicTitle ?? null,
            artist: post.musicArtist ?? null,
            durationMs: post.musicDurationMs ?? null,
          }
        : null,
      attachments,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private toPostAuthorResponse(user?: User): PostResponseDto['author'] {
    if (!user) return null;

    if (user.playerProfile) {
      const profilePictureUrl = this.resolveMediaUrl(
        user.playerProfile.profilePictureUrl,
      );
      return {
        id: user.id,
        role: user.role,
        name: user.playerProfile.fullName,
        profilePictureUrl,
        profile_picture_url: profilePictureUrl,
        avatarUrl: profilePictureUrl,
        avatar_url: profilePictureUrl,
        position: user.playerProfile.position ?? null,
        isVerified: user.playerProfile.isVerified,
      };
    }

    if (user.scoutProfile) {
      const profilePictureUrl = this.resolveMediaUrl(
        user.scoutProfile.profilePictureUrl,
      );
      return {
        id: user.id,
        role: user.role,
        name: user.scoutProfile.fullName,
        profilePictureUrl,
        profile_picture_url: profilePictureUrl,
        avatarUrl: profilePictureUrl,
        avatar_url: profilePictureUrl,
        position: user.scoutProfile.organization,
        isVerified: user.scoutProfile.verificationStatus === 'verified',
      };
    }

    return {
      id: user.id,
      role: user.role,
      name: user.email,
      profilePictureUrl: null,
      profile_picture_url: null,
      avatarUrl: null,
      avatar_url: null,
      position: null,
      isVerified: false,
    };
  }

  private toAttachmentResponse(
    attachment: Attachment & { video?: Video },
  ): AttachmentResponseDto {
    return {
      id: attachment.id,
      postId: attachment.postId,
      contentType: attachment.contentType,
      url: this.resolveMediaUrl(attachment.url) ?? attachment.url,
      position: attachment.position,
      videoDuration:
        attachment.contentType === 'video' && attachment.video
          ? attachment.video.videoDuration
          : undefined,
      videoThumbnailUrl:
        attachment.contentType === 'video' && attachment.video
          ? this.resolveMediaUrl(attachment.video.videoThumbnailUrl)
          : undefined,
    };
  }

  private resolveMediaUrl(value: string | null | undefined): string | null {
    return this.mediaUrlService.resolvePublicMediaUrl(value);
  }

  private toCommentResponse(comment: Comment): CommentResponseDto {
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      parentCommentId: comment.parentComment ?? undefined,
      isReported: comment.isReported,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private async notifyPostLiked(post: Post, actorId: string): Promise<void> {
    if (post.userId === actorId) {
      return;
    }

    const actor = await this.findUserWithProfiles(actorId);
    this.eventEmitter.emit('notification.create', {
      userId: post.userId,
      title: 'New like',
      message: `${this.getDisplayName(actor)} liked your post.`,
      type: 'like',
      referenceId: post.id,
      preference: 'postEngagement',
    });
  }

  private async notifyPostCommented(
    post: Post,
    actorId: string,
    content: string,
  ): Promise<void> {
    if (post.userId === actorId) {
      return;
    }

    const actor = await this.findUserWithProfiles(actorId);
    const preview = content.trim().slice(0, 120);
    this.eventEmitter.emit('notification.create', {
      userId: post.userId,
      title: 'New comment',
      message: preview
        ? `${this.getDisplayName(actor)} commented: ${preview}`
        : `${this.getDisplayName(actor)} commented on your post.`,
      type: 'comment',
      referenceId: post.id,
      preference: 'postEngagement',
    });
  }

  private findUserWithProfiles(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['playerProfile', 'scoutProfile'],
    });
  }

  private getDisplayName(user?: User | null): string {
    return (
      user?.playerProfile?.fullName ??
      user?.scoutProfile?.fullName ??
      user?.username ??
      user?.email ??
      'Someone'
    );
  }
}
