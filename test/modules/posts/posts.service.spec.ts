import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

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
import { PostsService } from '@/modules/posts/posts.service';

type RepositoryMock = {
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  increment: jest.Mock;
  decrement: jest.Mock;
  delete: jest.Mock;
  find: jest.Mock;
  findAndCount: jest.Mock;
  createQueryBuilder?: jest.Mock;
};

type PostResponseForTest = {
  music: {
    url: string;
    title: string | null;
    artist: string | null;
    durationMs: number | null;
  } | null;
};

function createRepositoryMock(): RepositoryMock {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value: unknown) => value),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    decrement: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
}

function createService(
  overrides: {
    postRepository?: Partial<Repository<Post>>;
    likeRepository?: Partial<Repository<Like>>;
    commentRepository?: Partial<Repository<Comment>>;
    userRepository?: Partial<Repository<User>>;
    videoRepository?: Partial<Repository<Video>>;
    blockRepository?: Partial<Repository<Block>>;
    muteRepository?: Partial<Repository<Mute>>;
    mediaUrlService?: Partial<MediaUrlService>;
    eventEmitter?: { emit: jest.Mock };
    aiRecommendationService?: {
      getScoutRecommendations: jest.Mock;
    };
  } = {},
) {
  const postRepository = {
    ...createRepositoryMock(),
    ...overrides.postRepository,
  };
  const likeRepository = {
    ...createRepositoryMock(),
    ...overrides.likeRepository,
  };
  const commentRepository = {
    ...createRepositoryMock(),
    ...overrides.commentRepository,
  };
  const userRepository = {
    ...createRepositoryMock(),
    ...overrides.userRepository,
  };
  const videoRepository = {
    ...createRepositoryMock(),
    ...overrides.videoRepository,
  };
  const blockRepository = {
    ...createRepositoryMock(),
    ...overrides.blockRepository,
  };
  const muteRepository = {
    ...createRepositoryMock(),
    ...overrides.muteRepository,
  };
  const emptyRepository = createRepositoryMock();
  const mediaUrlService = {
    resolvePublicMediaUrl: jest.fn((value?: string | null) =>
      value ? `https://media.example.com/${value}` : null,
    ),
    ...overrides.mediaUrlService,
  };
  const eventEmitter = overrides.eventEmitter ?? { emit: jest.fn() };
  const aiRecommendationService = overrides.aiRecommendationService ?? {
    getScoutRecommendations: jest.fn(),
  };

  const service = new PostsService(
    postRepository as unknown as Repository<Post>,
    emptyRepository as unknown as Repository<Attachment>,
    likeRepository as unknown as Repository<Like>,
    commentRepository as unknown as Repository<Comment>,
    emptyRepository as unknown as Repository<Bookmark>,
    userRepository as unknown as Repository<User>,
    emptyRepository as unknown as Repository<MediaModeration>,
    videoRepository as unknown as Repository<Video>,
    emptyRepository as unknown as Repository<Report>,
    blockRepository as unknown as Repository<Block>,
    muteRepository as unknown as Repository<Mute>,
    mediaUrlService as unknown as MediaUrlService,
    eventEmitter as never,
    aiRecommendationService as never,
  );

  return {
    service,
    postRepository,
    likeRepository,
    commentRepository,
    userRepository,
    videoRepository,
    blockRepository,
    muteRepository,
    mediaUrlService,
    eventEmitter,
    aiRecommendationService,
  };
}

function createQueryBuilderMock() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return qb;
}

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post_1',
    userId: 'user_1',
    caption: 'Caption',
    visibility: 'public',
    isHighlight: false,
    engagementScore: 0,
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    sharesCount: 0,
    isReported: false,
    musicUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicDurationMs: null,
    attachments: [],
    createdAt: new Date('2026-06-25T10:00:00.000Z'),
    updatedAt: new Date('2026-06-25T10:00:00.000Z'),
    ...overrides,
  } as Post;
}

describe('PostsService music metadata', () => {
  it('includes persisted music metadata in post responses', () => {
    const { service } = createService();
    const response = (
      service as unknown as {
        toPostResponse: (post: Post) => PostResponseForTest;
      }
    ).toPostResponse(
      createPost({
        musicUrl: 'audio/sprint-mix.mp3',
        musicTitle: 'Sprint Mix',
        musicArtist: 'NxtPro Studio',
        musicDurationMs: 92000,
      }),
    );

    expect(response.music).toEqual({
      url: 'https://media.example.com/audio/sprint-mix.mp3',
      title: 'Sprint Mix',
      artist: 'NxtPro Studio',
      durationMs: 92000,
    });
  });

  it('updates music metadata for owned posts', async () => {
    const existing = createPost();
    const postRepository = createRepositoryMock();
    postRepository.findOne.mockResolvedValue(existing);
    postRepository.save.mockImplementation((post: Post) =>
      Promise.resolve(post),
    );
    const { service } = createService({ postRepository });

    const response = await service.updatePost('post_1', 'user_1', {
      musicUrl: 'https://cdn.example.com/audio/track.mp3',
      musicTitle: 'Match Day',
      musicArtist: 'Captain',
    });

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        musicUrl: 'https://cdn.example.com/audio/track.mp3',
        musicTitle: 'Match Day',
        musicArtist: 'Captain',
      }),
    );
    expect(response.music?.title).toBe('Match Day');
  });

  it('removes music metadata when musicUrl is null', async () => {
    const existing = createPost({
      musicUrl: 'audio/track.mp3',
      musicTitle: 'Track',
      musicArtist: 'Artist',
      musicDurationMs: 1000,
    });
    const postRepository = createRepositoryMock();
    postRepository.findOne.mockResolvedValue(existing);
    postRepository.save.mockImplementation((post: Post) =>
      Promise.resolve(post),
    );
    const { service } = createService({ postRepository });

    const response = await service.updatePost('post_1', 'user_1', {
      musicUrl: null,
    });

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        musicUrl: null,
        musicTitle: null,
        musicArtist: null,
        musicDurationMs: null,
      }),
    );
    expect(response.music).toBeNull();
  });

  it('rejects music updates from non-owners', async () => {
    const postRepository = createRepositoryMock();
    postRepository.findOne.mockResolvedValue(createPost({ userId: 'owner_1' }));
    const { service } = createService({ postRepository });

    await expect(
      service.updatePost('post_1', 'user_2', {
        musicUrl: 'https://cdn.example.com/audio/track.mp3',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PostsService engagement notifications', () => {
  it('notifies the post owner when another user comments', async () => {
    const post = createPost({ id: 'post_1', userId: 'owner_1' });
    const comment = {
      id: 'comment_1',
      postId: post.id,
      userId: 'actor_1',
      content: 'Great session',
      createdAt: new Date('2026-06-25T10:00:00.000Z'),
      updatedAt: new Date('2026-06-25T10:00:00.000Z'),
    } as Comment;
    const postRepository = createRepositoryMock();
    const commentRepository = createRepositoryMock();
    const userRepository = createRepositoryMock();
    const eventEmitter = { emit: jest.fn() };

    postRepository.findOne.mockResolvedValue(post);
    commentRepository.create.mockReturnValue(comment);
    commentRepository.save.mockResolvedValue(comment);
    userRepository.findOne.mockResolvedValue({
      id: 'actor_1',
      username: 'Commenter',
    });
    const { service } = createService({
      postRepository,
      commentRepository,
      userRepository,
      eventEmitter,
    });

    await service.createComment(post.id, 'actor_1', {
      content: 'Great session',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'owner_1',
      title: 'New comment',
      message: 'Commenter commented: Great session',
      type: 'comment',
      referenceId: post.id,
      preference: 'postEngagement',
    });
  });

  it('does not notify a user about their own comment', async () => {
    const post = createPost({ id: 'post_1', userId: 'owner_1' });
    const comment = {
      id: 'comment_1',
      postId: post.id,
      userId: 'owner_1',
      content: 'My update',
      createdAt: new Date('2026-06-25T10:00:00.000Z'),
      updatedAt: new Date('2026-06-25T10:00:00.000Z'),
    } as Comment;
    const postRepository = createRepositoryMock();
    const commentRepository = createRepositoryMock();
    const eventEmitter = { emit: jest.fn() };

    postRepository.findOne.mockResolvedValue(post);
    commentRepository.create.mockReturnValue(comment);
    commentRepository.save.mockResolvedValue(comment);
    const { service } = createService({
      postRepository,
      commentRepository,
      eventEmitter,
    });

    await service.createComment(post.id, 'owner_1', { content: 'My update' });

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.anything(),
    );
  });

  it('notifies the post owner on a first like only', async () => {
    const post = createPost({ id: 'post_1', userId: 'owner_1' });
    const postRepository = createRepositoryMock();
    const likeRepository = createRepositoryMock();
    const userRepository = createRepositoryMock();
    const eventEmitter = { emit: jest.fn() };

    postRepository.findOne.mockResolvedValue({ ...post, likesCount: 1 });
    likeRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({
      id: 'actor_1',
      username: 'Liker',
    });
    const { service } = createService({
      postRepository,
      likeRepository,
      userRepository,
      eventEmitter,
    });

    await service.likePost(post.id, 'actor_1');

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'owner_1',
      title: 'New like',
      message: 'Liker liked your post.',
      type: 'like',
      referenceId: post.id,
      preference: 'postEngagement',
    });
  });
});

describe('PostsService personalized FYP', () => {
  it('orders authenticated scout FYP posts by recommendation output', async () => {
    const qb = createQueryBuilderMock();
    const postRepository = createRepositoryMock();
    postRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
    qb.getManyAndCount.mockResolvedValue([
      [
        createPost({ id: 'post_2', userId: 'player_2' }),
        createPost({ id: 'post_1', userId: 'player_1' }),
      ],
      2,
    ]);
    const aiRecommendationService = {
      getScoutRecommendations: jest.fn().mockResolvedValue({
        scout_id: 'scout_1',
        data_source: 'live_context',
        metadata: {
          personalized: true,
          fallback: false,
          live_context: true,
          candidate_count: 2,
          returned_count: 2,
        },
        recommendations: [
          { player_id: 'player_2', score: 0.9 },
          { player_id: 'player_1', score: 0.8 },
        ],
      }),
    };
    const { service } = createService({
      postRepository,
      aiRecommendationService,
    });

    const response = await service.getFypFeed(
      { sub: 'scout_1', role: 'scout' },
      1,
      10,
    );

    expect(
      aiRecommendationService.getScoutRecommendations,
    ).toHaveBeenCalledWith('scout_1', 30);
    expect(qb.andWhere).toHaveBeenCalledWith(
      'p.userId IN (:...recommendedUserIds)',
      { recommendedUserIds: ['player_2', 'player_1'] },
    );
    expect(qb.setParameters).toHaveBeenCalledWith({
      recommendedUserId0: 'player_2',
      recommendedUserId1: 'player_1',
    });
    expect(qb.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('recommendedUserId0'),
      'recommendation_rank',
    );
    expect(qb.orderBy).toHaveBeenCalledWith('recommendation_rank', 'ASC');
    expect(response.data.map(post => post.userId)).toEqual([
      'player_2',
      'player_1',
    ]);
    expect(response.recommendation).toEqual(
      expect.objectContaining({
        personalized: true,
        fallback: false,
        live_context: true,
      }),
    );
  });

  it('keeps generic FYP for unauthenticated users', async () => {
    const qb = createQueryBuilderMock();
    const postRepository = createRepositoryMock();
    postRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
    const aiRecommendationService = {
      getScoutRecommendations: jest.fn(),
    };
    const { service } = createService({
      postRepository,
      aiRecommendationService,
    });

    await service.getFypFeed(undefined, 1, 10);

    expect(
      aiRecommendationService.getScoutRecommendations,
    ).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('p.engagementScore', 'DESC');
  });
});

describe('PostsService video scoping', () => {
  it('filters profile videos by the requested viewed player id', async () => {
    const qb = createQueryBuilderMock();
    const videoRepository = createRepositoryMock();
    videoRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
    const { service } = createService({ videoRepository });

    await service.listVideos('viewer_1', 1, 18, true, 'player_x');

    expect(qb.andWhere).toHaveBeenCalledWith('p.userId = :targetUserId', {
      targetUserId: 'player_x',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'p.visibility = :publicVisibility',
      {
        publicVisibility: 'public',
      },
    );
  });

  it('does not require public visibility when requesting your own videos', async () => {
    const qb = createQueryBuilderMock();
    const videoRepository = createRepositoryMock();
    videoRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
    const { service } = createService({ videoRepository });

    await service.listVideos('player_x', 1, 18, true, 'player_x');

    expect(qb.andWhere).toHaveBeenCalledWith('p.userId = :targetUserId', {
      targetUserId: 'player_x',
    });
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'p.visibility = :publicVisibility',
      expect.anything(),
    );
  });
});
