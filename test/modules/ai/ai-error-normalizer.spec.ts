import {
  normalizeAiError,
  normalizeAiHttpError,
} from '@/integrations/ai/ai-error-normalizer';

describe('AI error normalizer', () => {
  it('maps stable AI service HTTP error bodies to friendly app errors', () => {
    const normalized = normalizeAiHttpError(
      422,
      {
        detail: {
          code: 'AI_REQUIRED_ACTION_NOT_DETECTED',
          message: 'raw model text should not win',
          retryable: true,
          details: { skill: 'pace' },
        },
      },
      { serviceName: 'ai-skills', skillKey: 'pace', operation: 'scoring' },
    );

    expect(normalized).toEqual(
      expect.objectContaining({
        code: 'AI_REQUIRED_ACTION_NOT_DETECTED',
        message:
          'We could not detect the required movement for this skill. Please check the tutorial and try again.',
        retryable: true,
        serviceName: 'ai-skills',
        skillKey: 'pace',
      }),
    );
  });

  it('maps AI timeouts to AI_SERVICE_TIMEOUT', () => {
    const normalized = normalizeAiError(new Error('The operation timed out'), {
      serviceName: 'ai-skills',
      operation: 'scoring',
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        code: 'AI_SERVICE_TIMEOUT',
        message:
          'AI scoring took too long. Please try a shorter or clearer video.',
        retryable: true,
      }),
    );
  });

  it('maps connection failures to AI_SERVICE_UNAVAILABLE', () => {
    const normalized = normalizeAiError(
      new Error('connect ECONNREFUSED 127.0.0.1:8001'),
      { serviceName: 'ai-skills', operation: 'scoring' },
    );

    expect(normalized).toEqual(
      expect.objectContaining({
        code: 'AI_SERVICE_UNAVAILABLE',
        message:
          'AI scoring is temporarily unavailable. Please try again later.',
        retryable: true,
      }),
    );
  });

  it('maps invalid AI result messages to AI_RESULT_INVALID', () => {
    const normalized = normalizeAiError(
      new Error('AI pace response did not include scoreable speed data'),
      { serviceName: 'ai-skills', skillKey: 'pace', operation: 'scoring' },
    );

    expect(normalized).toEqual(
      expect.objectContaining({
        code: 'AI_RESULT_INVALID',
        message: 'We could not read the AI result safely. Please try again.',
      }),
    );
  });
});
