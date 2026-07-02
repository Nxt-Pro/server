import { ServiceUnavailableException } from '@nestjs/common';

import { AiRecommendationService } from '@/integrations/ai/ai-recommendation.service';

type RepositoryMock = Record<string, jest.Mock>;

function createRepositoryMock(overrides: Partial<RepositoryMock> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

function createChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return { ...chain, ...overrides };
}

function readFirstFetchJsonBody(): Record<string, unknown> {
  const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
  const init = fetchMock.mock.calls[0]?.[1];
  const body = init?.body;
  if (typeof body !== 'string') {
    throw new Error('Expected fetch body to be a JSON string');
  }
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected fetch body to be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

describe('AiRecommendationService', () => {
  let originalFetch: typeof global.fetch;
  let playerProfiles: RepositoryMock;
  let blocks: RepositoryMock;
  let mutes: RepositoryMock;
  let users: RepositoryMock;
  let scoutProfiles: RepositoryMock;
  let posts: RepositoryMock;
  let likes: RepositoryMock;
  let bookmarks: RepositoryMock;
  let connections: RepositoryMock;
  let chats: RepositoryMock;

  beforeEach(() => {
    originalFetch = global.fetch;
    playerProfiles = createRepositoryMock();
    blocks = createRepositoryMock();
    mutes = createRepositoryMock();
    users = createRepositoryMock();
    scoutProfiles = createRepositoryMock();
    posts = createRepositoryMock();
    likes = createRepositoryMock();
    bookmarks = createRepositoryMock();
    connections = createRepositoryMock();
    chats = createRepositoryMock({
      createQueryBuilder: jest.fn().mockReturnValue(createChain()),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(url?: string) {
    const recommendationServiceUrl =
      arguments.length === 0 ? 'http://ai-recommendation:8002/' : url;
    return new AiRecommendationService(
      {
        getOrThrow: jest.fn().mockReturnValue({
          recommendationServiceUrl,
          timeoutMs: 120000,
        }),
      } as never,
      playerProfiles as never,
      blocks as never,
      mutes as never,
      users as never,
      scoutProfiles as never,
      posts as never,
      likes as never,
      bookmarks as never,
      connections as never,
      chats as never,
    );
  }

  function mockContextRepositories() {
    users.findOne.mockResolvedValue({ id: 'scout-1', role: 'scout' });
    scoutProfiles.findOne.mockResolvedValue({
      userId: 'scout-1',
      scoutingPositions: ['ST', 'RW'],
      countriesCovered: ['Egypt'],
      organization: 'Nxt FC',
    });
    blocks.find.mockResolvedValue([
      { blockerId: 'scout-1', blockedId: 'blocked-player' },
    ]);
    mutes.find.mockResolvedValue([
      { muterId: 'scout-1', mutedId: 'muted-player' },
    ]);
    connections.find.mockResolvedValue([
      { playerId: 'handled-player', status: 'accepted' },
    ]);
    likes.find.mockResolvedValue([{ postId: 'liked-post-1' }]);
    bookmarks.find.mockResolvedValue([{ bookmarkableId: 'saved-post-1' }]);
    playerProfiles.createQueryBuilder.mockReturnValue(
      createChain({
        getMany: jest.fn().mockResolvedValue([
          {
            userId: 'player-1',
            dateOfBirth: new Date('2004-01-01T00:00:00.000Z'),
            position: 'ST',
            city: 'Cairo',
            country: 'Egypt',
            aiScore: 88,
            isVerified: true,
            skillScores: { pace: 0.9 },
            totalPosts: 3,
            totalLikes: 20,
            totalViews: 100,
          },
        ]),
      }),
    );
    posts.createQueryBuilder.mockReturnValue(
      createChain({
        getRawMany: jest.fn().mockResolvedValue([
          {
            userId: 'player-1',
            postCount: '4',
            videoCount: '2',
            recentEngagementScore: '12.5',
          },
        ]),
      }),
    );
  }

  it('sends live viewer context and maps hydrated recommendations', async () => {
    mockContextRepositories();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          viewer_id: 'scout-1',
          generated_at: '2026-06-26T00:00:00.000Z',
          data_source: 'live_context',
          model_version: 'context-ranker-v1',
          metadata: {
            personalized: true,
            fallback: false,
            live_context: true,
            candidate_count: 1,
          },
          recommendations: [
            {
              player_id: 'player-1',
              score: '0.91',
            },
            {
              player_id: 'blocked-player',
              score: 0.8,
            },
            {
              player_id: 'muted-player',
              score: 0.7,
            },
            {
              player_id: 'banned-player',
              score: 0.6,
            },
            {
              player_id: 'unknown-player',
              score: 0.5,
            },
          ],
        }),
    }) as never;
    playerProfiles.find.mockResolvedValue([
      {
        userId: 'player-1',
        fullName: 'DB Player One',
        position: 'ST',
        clubName: 'Nxt FC',
        profilePictureUrl: 'https://cdn.test/player.png',
        aiScore: 88,
        isVerified: true,
        user: { role: 'player', status: 'active' },
      },
      {
        userId: 'blocked-player',
        fullName: 'Blocked Player',
        user: { role: 'player', status: 'active' },
      },
      {
        userId: 'muted-player',
        fullName: 'Muted Player',
        user: { role: 'player', status: 'active' },
      },
      {
        userId: 'banned-player',
        fullName: 'Banned Player',
        user: { role: 'player', status: 'banned' },
      },
    ]);

    const service = createService();

    await expect(
      service.getScoutRecommendations('scout-1', 20),
    ).resolves.toEqual({
      scout_id: 'scout-1',
      generated_at: '2026-06-26T00:00:00.000Z',
      data_source: 'live_context',
      metadata: {
        personalized: true,
        fallback: false,
        data_source: 'live_context',
        live_context: true,
        candidate_count: 1,
        returned_count: 1,
        model_version: 'context-ranker-v1',
      },
      recommendations: [
        {
          player_id: 'player-1',
          score: 0.91,
          full_name: 'DB Player One',
          position: 'ST',
          club_name: 'Nxt FC',
          profile_picture_url: 'https://cdn.test/player.png',
          ai_score: 88,
          is_verified: true,
        },
      ],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://ai-recommendation:8002/api/recommendations/context',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    const requestBody = readFirstFetchJsonBody();
    expect(requestBody.viewer).toMatchObject({
      id: 'scout-1',
      role: 'scout',
      positionPreferences: ['ST', 'RW'],
      location: 'Egypt',
      club: 'Nxt FC',
    });
    expect(requestBody.signals).toMatchObject({
      likedPostIds: ['liked-post-1'],
      bookmarkedPostIds: ['saved-post-1'],
      connectedUserIds: ['handled-player'],
    });
    expect(requestBody).toHaveProperty(
      'exclude.userIds',
      expect.arrayContaining([
        'scout-1',
        'blocked-player',
        'muted-player',
        'handled-player',
      ]),
    );
    expect(requestBody).toHaveProperty('candidates', [
      expect.objectContaining({
        playerId: 'player-1',
        position: 'ST',
        location: 'Cairo, Egypt',
        aiScore: 88,
        isVerified: true,
        postCount: 4,
        videoCount: 2,
        recentEngagementScore: 12.5,
      }),
    ]);
  });

  it('returns empty metadata when no eligible candidates exist', async () => {
    mockContextRepositories();
    global.fetch = jest.fn() as never;
    playerProfiles.createQueryBuilder.mockReturnValue(
      createChain({ getMany: jest.fn().mockResolvedValue([]) }),
    );
    const service = createService();

    const response = await service.getScoutRecommendations('scout-1');

    expect(response).toMatchObject({
      scout_id: 'scout-1',
      data_source: 'live_context',
      recommendations: [],
    });
    expect(response.metadata).toMatchObject({
      personalized: false,
      fallback: false,
      reason: 'no_eligible_candidates',
      candidate_count: 0,
      returned_count: 0,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fails clearly when the recommendation URL is not configured', async () => {
    const service = createService(undefined);

    await expect(
      service.getScoutRecommendations('scout-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a safe error when the recommendation service is unavailable', async () => {
    mockContextRepositories();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as never;

    const service = createService('http://ai-recommendation:8002');

    await expect(
      service.getScoutRecommendations('scout-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
