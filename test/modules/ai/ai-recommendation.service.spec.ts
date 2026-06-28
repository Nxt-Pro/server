import { ServiceUnavailableException } from '@nestjs/common';

import { AiRecommendationService } from '@/integrations/ai/ai-recommendation.service';

describe('AiRecommendationService', () => {
  let originalFetch: typeof global.fetch;
  let playerProfiles: { find: jest.Mock };
  let blocks: { find: jest.Mock };
  let mutes: { find: jest.Mock };

  beforeEach(() => {
    originalFetch = global.fetch;
    playerProfiles = { find: jest.fn() };
    blocks = { find: jest.fn() };
    mutes = { find: jest.fn() };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps scout recommendations from the AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          scout_id: 'scout-1',
          generated_at: '2026-06-26T00:00:00.000Z',
          data_source: 'export',
          recommendations: [
            {
              player_id: 'player-1',
              score: '0.91',
              full_name: 'Raw AI Name',
              position: 'Raw',
              club_name: 'Raw FC',
              profile_picture_url: 'https://cdn.test/raw.png',
              ai_score: '12',
              is_verified: false,
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
    blocks.find.mockResolvedValue([
      { blockerId: 'scout-1', blockedId: 'blocked-player' },
    ]);
    mutes.find.mockResolvedValue([
      { muterId: 'scout-1', mutedId: 'muted-player' },
    ]);

    const service = new AiRecommendationService(
      {
        getOrThrow: jest.fn().mockReturnValue({
          recommendationServiceUrl: 'http://ai-recommendation:8002/',
          timeoutMs: 120000,
        }),
      } as never,
      playerProfiles as never,
      blocks as never,
      mutes as never,
    );

    await expect(
      service.getScoutRecommendations('scout-1', 20),
    ).resolves.toEqual({
      scout_id: 'scout-1',
      generated_at: '2026-06-26T00:00:00.000Z',
      data_source: 'export',
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
      'http://ai-recommendation:8002/api/scouts/scout-1/recommendations?k=20',
      expect.anything(),
    );
  });

  it('fails clearly when the recommendation URL is not configured', async () => {
    const service = new AiRecommendationService(
      {
        getOrThrow: jest.fn().mockReturnValue({
          recommendationServiceUrl: undefined,
          timeoutMs: 120000,
        }),
      } as never,
      playerProfiles as never,
      blocks as never,
      mutes as never,
    );

    await expect(
      service.getScoutRecommendations('scout-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a safe error when the recommendation service is unavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as never;

    const service = new AiRecommendationService(
      {
        getOrThrow: jest.fn().mockReturnValue({
          recommendationServiceUrl: 'http://ai-recommendation:8002',
          timeoutMs: 120000,
        }),
      } as never,
      playerProfiles as never,
      blocks as never,
      mutes as never,
    );

    await expect(
      service.getScoutRecommendations('scout-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
