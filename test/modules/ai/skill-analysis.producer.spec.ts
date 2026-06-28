import { JobType } from '@/common/enums';
import { SkillAnalysisProducer } from '@/queues/producers';

describe('SkillAnalysisProducer AI scoring jobs', () => {
  it('queues skill scoring jobs with retry/backoff options', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'bull-job-1' }),
      getJob: jest.fn(),
    };
    const progressTracker = {
      initProgress: jest.fn(),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({ retryAttempts: 4 }),
    };
    const producer = new SkillAnalysisProducer(
      queue as never,
      progressTracker as never,
      configService as never,
    );

    await expect(
      producer.queueSkillScoring({
        scoringJobId: 'score-job-1',
        playerId: 'player-1',
        requestedBy: 'player-1',
        skillKey: 'pace',
        heightCm: 180,
        media: {
          pace: {
            url: 'http://cdn.test/pace.mp4',
            mimeType: 'video/mp4',
          },
        },
      }),
    ).resolves.toEqual({ jobId: 'bull-job-1' });

    expect(queue.add).toHaveBeenCalledWith(
      JobType.SKILL_SCORING,
      expect.objectContaining({ scoringJobId: 'score-job-1' }),
      expect.objectContaining({
        attempts: 4,
        backoff: { type: 'exponential', delay: 5000 },
        priority: 1,
      }),
    );
    expect(progressTracker.initProgress).toHaveBeenCalledWith(
      'bull-job-1',
      'analysis',
      5,
      'player-1',
    );
  });
});
