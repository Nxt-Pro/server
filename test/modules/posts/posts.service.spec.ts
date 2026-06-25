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
  };
}

function createService(
  overrides: {
    postRepository?: Partial<Repository<Post>>;
    mediaUrlService?: Partial<MediaUrlService>;
  } = {},
) {
  const postRepository = {
    ...createRepositoryMock(),
    ...overrides.postRepository,
  };
  const emptyRepository = createRepositoryMock();
  const mediaUrlService = {
    resolvePublicMediaUrl: jest.fn((value?: string | null) =>
      value ? `https://media.example.com/${value}` : null,
    ),
    ...overrides.mediaUrlService,
  };

  const service = new PostsService(
    postRepository as unknown as Repository<Post>,
    emptyRepository as unknown as Repository<Attachment>,
    emptyRepository as unknown as Repository<Like>,
    emptyRepository as unknown as Repository<Comment>,
    emptyRepository as unknown as Repository<Bookmark>,
    emptyRepository as unknown as Repository<User>,
    emptyRepository as unknown as Repository<MediaModeration>,
    emptyRepository as unknown as Repository<Video>,
    emptyRepository as unknown as Repository<Report>,
    emptyRepository as unknown as Repository<Block>,
    emptyRepository as unknown as Repository<Mute>,
    mediaUrlService as unknown as MediaUrlService,
  );

  return { service, postRepository, mediaUrlService };
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
