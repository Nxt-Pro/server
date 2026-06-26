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
    mediaUrlService?: Partial<MediaUrlService>;
    eventEmitter?: { emit: jest.Mock };
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
  const emptyRepository = createRepositoryMock();
  const mediaUrlService = {
    resolvePublicMediaUrl: jest.fn((value?: string | null) =>
      value ? `https://media.example.com/${value}` : null,
    ),
    ...overrides.mediaUrlService,
  };
  const eventEmitter = overrides.eventEmitter ?? { emit: jest.fn() };

  const service = new PostsService(
    postRepository as unknown as Repository<Post>,
    emptyRepository as unknown as Repository<Attachment>,
    likeRepository as unknown as Repository<Like>,
    commentRepository as unknown as Repository<Comment>,
    emptyRepository as unknown as Repository<Bookmark>,
    userRepository as unknown as Repository<User>,
    emptyRepository as unknown as Repository<MediaModeration>,
    emptyRepository as unknown as Repository<Video>,
    emptyRepository as unknown as Repository<Report>,
    emptyRepository as unknown as Repository<Block>,
    emptyRepository as unknown as Repository<Mute>,
    mediaUrlService as unknown as MediaUrlService,
    eventEmitter as never,
  );

  return {
    service,
    postRepository,
    likeRepository,
    commentRepository,
    userRepository,
    mediaUrlService,
    eventEmitter,
  };
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
