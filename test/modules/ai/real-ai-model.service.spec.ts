import { ModerationResult } from '@/common/enums';
import { RealAiModelService } from '@/integrations/ai/services/real-ai-model.service';

describe('RealAiModelService moderation', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses AI_MODERATION_SERVICE_URL and the JSON /moderate-video contract', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          verdict: 'flagged',
          confidence: 0.91,
          is_football_related: true,
          inappropriate_content: false,
          flags: ['high_irrelevant_confidence'],
          details: { spam: 0.3 },
        }),
    }) as never;

    const service = new RealAiModelService(
      {
        getOrThrow: jest.fn().mockReturnValue({
          skillServiceUrl: 'http://ai-skills:8001',
          moderationServiceUrl: 'http://ai-moderation:8003',
          timeoutMs: 120000,
          apiKey: undefined,
        }),
      } as never,
      { findByUserId: jest.fn() } as never,
    );

    await expect(
      service.moderateVideo('http://api.test/uploads/videos/clip.mp4'),
    ).resolves.toEqual({
      verdict: ModerationResult.FLAGGED,
      confidence: 0.91,
      isFootballRelated: true,
      inappropriateContent: false,
      flags: ['high_irrelevant_confidence'],
      details: { spam: 0.3 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://ai-moderation:8003/moderate-video',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          video_url: 'http://api.test/uploads/videos/clip.mp4',
        }),
      }),
    );
  });
});
