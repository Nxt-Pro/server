import { SkillScoringService } from '@/integrations/ai/skill-scoring.service';

describe('SkillScoringService', () => {
  const aiConfig = {
    scoringEnabled: true,
    queueEnabled: true,
    skillServiceUrl: 'http://ai-skills:8001',
    timeoutMs: 120000,
    retryAttempts: 3,
    maxScoringMediaBytes: 104857600,
    useMock: false,
  };
  const uploadConfig = {
    storageProvider: 'local',
    localUploadDir: 'uploads',
    localPublicBaseUrl: 'http://localhost:3000/uploads',
  };

  let scoringJobs: {
    findActiveForSkill: jest.Mock;
    create: jest.Mock;
    setQueueJobId: jest.Mock;
    findVisibleJob: jest.Mock;
    listForUser: jest.Mock;
    markProcessing: jest.Mock;
    markCompleted: jest.Mock;
    markFailed: jest.Mock;
  };
  let playerProfiles: {
    findByUserId: jest.Mock;
    updateByUserId: jest.Mock;
  };
  let producer: { queueSkillScoring: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let service: SkillScoringService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    scoringJobs = {
      findActiveForSkill: jest.fn(),
      create: jest.fn(),
      setQueueJobId: jest.fn(),
      findVisibleJob: jest.fn(),
      listForUser: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };
    playerProfiles = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    };
    producer = { queueSkillScoring: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'ai' ? aiConfig : uploadConfig,
      ),
    };

    service = new SkillScoringService(
      configService as never,
      scoringJobs as never,
      playerProfiles as never,
      producer as never,
      eventEmitter as never,
    );
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('enqueues a supported skill scoring job', async () => {
    playerProfiles.findByUserId.mockResolvedValue({
      userId: 'player-1',
      heightCm: 180,
      skillScores: {},
    });
    scoringJobs.findActiveForSkill.mockResolvedValue(null);
    scoringJobs.create.mockResolvedValue({
      id: 'score-job-1',
      status: 'queued',
    });
    producer.queueSkillScoring.mockResolvedValue({ jobId: 'bull-job-1' });

    const result = await service.submitSkillScoring('player-1', {
      skill: 'pace',
      heightCm: 180,
      media: {
        pace: {
          url: 'http://localhost:3000/uploads/videos/pace.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        },
      },
    });

    expect(result).toEqual({
      supported: true,
      scoringJobId: 'score-job-1',
      jobId: 'bull-job-1',
      status: 'queued',
      skillKey: 'pace',
      displayName: 'Pace',
    });
    expect(producer.queueSkillScoring).toHaveBeenCalledWith(
      expect.objectContaining({
        scoringJobId: 'score-job-1',
        skillKey: 'pace',
        heightCm: 180,
      }),
    );
    expect(scoringJobs.setQueueJobId).toHaveBeenCalledWith(
      'score-job-1',
      'bull-job-1',
    );
  });

  it('returns SKILL_NOT_SUPPORTED without enqueueing unsupported skills', async () => {
    const result = await service.submitSkillScoring('player-1', {
      skill: 'defense',
      media: {
        generic: {
          url: 'http://localhost:3000/uploads/videos/defense.mp4',
          mimeType: 'video/mp4',
        },
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        supported: false,
        code: 'SKILL_NOT_SUPPORTED',
        message: 'this skill is not supported yet',
      }),
    );
    expect(scoringJobs.create).not.toHaveBeenCalled();
    expect(producer.queueSkillScoring).not.toHaveBeenCalled();
  });

  it('stores completion, updates profile skill scores, and emits success notification', async () => {
    playerProfiles.findByUserId.mockResolvedValue({
      userId: 'player-1',
      skillScores: { passing: 70 },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-length': '5' }),
        blob: () => Promise.resolve(new Blob(['video'], { type: 'video/mp4' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            average_speed_kmh: 24,
            total_distance_covered: 91,
            confidence: 0.9,
            modelVersion: 'pace-v1',
          }),
      }) as never;

    await expect(
      service.processQueuedJob(
        {
          scoringJobId: 'score-job-1',
          playerId: 'player-1',
          requestedBy: 'player-1',
          skillKey: 'pace',
          heightCm: 180,
          media: {
            pace: {
              url: 'http://cdn.test/pace.mp4',
              mimeType: 'video/mp4',
              fileName: 'pace.mp4',
              sizeBytes: 1024,
            },
          },
        },
        'bull-job-1',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        scoringJobId: 'score-job-1',
        skillKey: 'pace',
        score: 86,
      }),
    );

    expect(scoringJobs.markProcessing).toHaveBeenCalledWith(
      'score-job-1',
      'bull-job-1',
    );
    expect(playerProfiles.updateByUserId).toHaveBeenCalledWith('player-1', {
      skillScores: { passing: 70, pace: 86 },
      aiScore: 78,
    });
    expect(scoringJobs.markCompleted).toHaveBeenCalledWith(
      'score-job-1',
      expect.objectContaining({
        score: 86,
        confidence: 0.9,
        modelVersion: 'pace-v1',
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'player-1',
      title: 'Skill score completed',
      message: 'Pace scoring finished with 86.',
      type: 'skill_score',
      referenceId: 'score-job-1',
    });
  });

  it('stores final failure and emits failure notification', async () => {
    await service.markQueuedJobFailed(
      {
        scoringJobId: 'score-job-1',
        playerId: 'player-1',
        requestedBy: 'player-1',
        skillKey: 'pace',
        media: {},
      },
      'AI service timed out',
    );

    expect(scoringJobs.markFailed).toHaveBeenCalledWith(
      'score-job-1',
      'AI service timed out',
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'player-1',
      title: 'Skill scoring failed',
      message: 'Pace scoring failed. Please retry with a clearer upload.',
      type: 'skill_score',
      referenceId: 'score-job-1',
    });
  });

  it('rejects too-large scoring media before enqueueing', async () => {
    playerProfiles.findByUserId.mockResolvedValue({
      userId: 'player-1',
      heightCm: 180,
      skillScores: {},
    });

    await expect(
      service.submitSkillScoring('player-1', {
        skill: 'pace',
        heightCm: 180,
        media: {
          pace: {
            url: 'http://localhost:3000/uploads/videos/pace.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 104857601,
          },
        },
      }),
    ).rejects.toThrow('too large');

    expect(scoringJobs.create).not.toHaveBeenCalled();
    expect(producer.queueSkillScoring).not.toHaveBeenCalled();
  });
});
