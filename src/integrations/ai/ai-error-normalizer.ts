export const AI_ERROR_CODES = [
  'SKILL_NOT_SUPPORTED',
  'AI_VIDEO_NOT_FOOTBALL',
  'AI_VIDEO_TOO_UNCLEAR',
  'AI_REQUIRED_ACTION_NOT_DETECTED',
  'AI_PERSON_NOT_VISIBLE',
  'AI_BALL_NOT_DETECTED',
  'AI_MEDIA_TOO_LARGE',
  'AI_MEDIA_INVALID',
  'AI_SERVICE_UNAVAILABLE',
  'AI_SERVICE_TIMEOUT',
  'AI_MODEL_NOT_READY',
  'AI_RESULT_INVALID',
  'AI_SCORING_FAILED',
  'AI_MODERATION_FAILED',
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export interface AiErrorContext {
  serviceName?: string;
  skillKey?: string;
  operation?: 'scoring' | 'moderation' | 'recommendation' | 'media';
}

export interface NormalizedAiError {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
  serviceName?: string;
  skillKey?: string;
  statusCode?: number;
  developerMessage?: string;
  details?: Record<string, unknown>;
}

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  SKILL_NOT_SUPPORTED: 'This skill is not supported by AI scoring yet.',
  AI_VIDEO_NOT_FOOTBALL:
    'The uploaded video does not look like a football video. Please upload a clearer football-related video.',
  AI_VIDEO_TOO_UNCLEAR:
    'We could not analyze this video clearly. Please upload a brighter, steadier video.',
  AI_REQUIRED_ACTION_NOT_DETECTED:
    'We could not detect the required movement for this skill. Please check the tutorial and try again.',
  AI_PERSON_NOT_VISIBLE:
    'We could not clearly see the player. Please upload a video where the full body is visible.',
  AI_BALL_NOT_DETECTED:
    'We could not detect the ball clearly. Please upload a video where the ball is visible.',
  AI_MEDIA_TOO_LARGE:
    'This video is too large for AI scoring. Please upload a shorter clip.',
  AI_MEDIA_INVALID:
    'We could not read this media file. Please upload a valid video and try again.',
  AI_SERVICE_UNAVAILABLE:
    'AI scoring is temporarily unavailable. Please try again later.',
  AI_SERVICE_TIMEOUT:
    'AI scoring took too long. Please try a shorter or clearer video.',
  AI_MODEL_NOT_READY:
    'AI scoring is still starting up. Please try again in a moment.',
  AI_RESULT_INVALID:
    'We could not read the AI result safely. Please try again.',
  AI_SCORING_FAILED:
    'We could not score this upload. Please try again with a clearer video.',
  AI_MODERATION_FAILED:
    'We could not analyze this video clearly. Please upload a brighter, steadier video.',
};

const RETRYABLE_CODES = new Set<AiErrorCode>([
  'AI_VIDEO_TOO_UNCLEAR',
  'AI_REQUIRED_ACTION_NOT_DETECTED',
  'AI_PERSON_NOT_VISIBLE',
  'AI_BALL_NOT_DETECTED',
  'AI_SERVICE_UNAVAILABLE',
  'AI_SERVICE_TIMEOUT',
  'AI_MODEL_NOT_READY',
  'AI_RESULT_INVALID',
  'AI_SCORING_FAILED',
  'AI_MODERATION_FAILED',
]);

export class AiServiceError extends Error {
  readonly normalized: NormalizedAiError;

  constructor(normalized: NormalizedAiError) {
    super(normalized.message);
    this.name = 'AiServiceError';
    this.normalized = normalized;
  }
}

type AiErrorExtras = Partial<Omit<NormalizedAiError, 'code' | 'message'>>;

export const isAiErrorCode = (value: unknown): value is AiErrorCode =>
  typeof value === 'string' && AI_ERROR_CODES.includes(value as AiErrorCode);

export const makeAiError = (
  code: AiErrorCode,
  context: AiErrorContext = {},
  extras: AiErrorExtras = {},
): NormalizedAiError => ({
  code,
  message: AI_ERROR_MESSAGES[code],
  retryable: RETRYABLE_CODES.has(code),
  serviceName: context.serviceName,
  skillKey: context.skillKey,
  ...extras,
});

export const toAiServiceError = (
  code: AiErrorCode,
  context: AiErrorContext = {},
  extras: AiErrorExtras = {},
): AiServiceError => new AiServiceError(makeAiError(code, context, extras));

export const normalizeAiError = (
  error: unknown,
  context: AiErrorContext = {},
): NormalizedAiError => {
  if (error instanceof AiServiceError) {
    return {
      ...error.normalized,
      serviceName: error.normalized.serviceName ?? context.serviceName,
      skillKey: error.normalized.skillKey ?? context.skillKey,
    };
  }

  const direct = readErrorObject(error);
  if (direct) {
    return mergeContext(direct, context);
  }

  const message = readErrorMessage(error);
  const statusCode = readStatusCode(error);
  return classifyAiFailure(message, context, statusCode);
};

export const normalizeAiHttpError = (
  statusCode: number,
  body: unknown,
  context: AiErrorContext = {},
): NormalizedAiError => {
  const fromBody = readErrorObject(body);
  if (fromBody) {
    return mergeContext(
      {
        ...fromBody,
        statusCode,
      },
      context,
    );
  }

  const bodyMessage = readErrorMessage(body);
  return classifyAiFailure(bodyMessage, context, statusCode);
};

export const aiErrorResponseBody = (error: NormalizedAiError) => ({
  code: error.code,
  message: error.message,
  retryable: error.retryable,
  details: {
    ...(error.serviceName ? { serviceName: error.serviceName } : {}),
    ...(error.skillKey ? { skill: error.skillKey } : {}),
    ...(error.statusCode ? { statusCode: error.statusCode } : {}),
    ...(error.details ?? {}),
  },
});

export const safeAiFailureDetails = (
  error: NormalizedAiError,
): Record<string, unknown> => ({
  code: error.code,
  retryable: error.retryable,
  ...(error.serviceName ? { serviceName: error.serviceName } : {}),
  ...(error.skillKey ? { skillKey: error.skillKey } : {}),
  ...(error.statusCode ? { statusCode: error.statusCode } : {}),
  ...(error.details ?? {}),
});

const mergeContext = (
  error: NormalizedAiError,
  context: AiErrorContext,
): NormalizedAiError => ({
  ...error,
  serviceName: error.serviceName ?? context.serviceName,
  skillKey: error.skillKey ?? context.skillKey,
});

const readErrorObject = (value: unknown): NormalizedAiError | null => {
  const root = unwrapErrorBody(value);
  if (!isRecord(root)) return null;

  const code = root.code;
  if (!isAiErrorCode(code)) return null;

  return makeAiError(
    code,
    {},
    {
      developerMessage: readString(
        root.developerMessage ?? root.developer_message,
      ),
      details: readRecord(root.details),
      retryable:
        typeof root.retryable === 'boolean'
          ? root.retryable
          : RETRYABLE_CODES.has(code),
      serviceName: readString(root.serviceName ?? root.service_name),
      skillKey: readString(root.skillKey ?? root.skill_key ?? root.skill),
    },
  );
};

const unwrapErrorBody = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const detail = value.detail;
  if (isRecord(detail)) return detail;
  return value;
};

const readErrorMessage = (value: unknown): string => {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return 'Unknown AI service error';

  const detail = value.detail;
  if (typeof detail === 'string') return detail;
  if (isRecord(detail)) return readErrorMessage(detail);

  const message = value.message ?? value.error ?? value.reason;
  if (typeof message === 'string') return message;

  return 'Unknown AI service error';
};

const readStatusCode = (value: unknown): number | undefined => {
  if (!isRecord(value)) return undefined;
  const status = value.status ?? value.statusCode;
  return typeof status === 'number' && Number.isFinite(status)
    ? status
    : undefined;
};

const classifyAiFailure = (
  rawMessage: string,
  context: AiErrorContext,
  statusCode?: number,
): NormalizedAiError => {
  const message = rawMessage || 'Unknown AI service error';
  const lower = message.toLowerCase();

  if (lower.includes('skill_not_supported')) {
    return makeAiError('SKILL_NOT_SUPPORTED', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (isTimeoutMessage(lower) || statusCode === 408 || statusCode === 504) {
    return makeAiError('AI_SERVICE_TIMEOUT', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (isConnectionMessage(lower) || statusCode === 502 || statusCode === 503) {
    return makeAiError('AI_SERVICE_UNAVAILABLE', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (lower.includes('too large') || lower.includes('maximum size')) {
    return makeAiError('AI_MEDIA_TOO_LARGE', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (lower.includes('not football') || lower.includes('non-football')) {
    return makeAiError('AI_VIDEO_NOT_FOOTBALL', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('too unclear') ||
    lower.includes('unclear') ||
    lower.includes('poor lighting') ||
    lower.includes('blurry')
  ) {
    return makeAiError('AI_VIDEO_TOO_UNCLEAR', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('model not') ||
    lower.includes('model missing') ||
    lower.includes('model file not found') ||
    lower.includes('not loaded') ||
    lower.includes('not ready')
  ) {
    return makeAiError('AI_MODEL_NOT_READY', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('no player') ||
    lower.includes('person') ||
    lower.includes('skeleton') ||
    lower.includes('pose') ||
    lower.includes('body landmark')
  ) {
    return makeAiError('AI_PERSON_NOT_VISIBLE', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (lower.includes('no ball') || lower.includes('ball not')) {
    return makeAiError('AI_BALL_NOT_DETECTED', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('action') ||
    lower.includes('movement') ||
    lower.includes('shot') ||
    lower.includes('pass') ||
    lower.includes('drill')
  ) {
    return makeAiError('AI_REQUIRED_ACTION_NOT_DETECTED', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('invalid response') ||
    lower.includes('did not include') ||
    lower.includes('could not read') ||
    lower.includes('response shape')
  ) {
    return makeAiError('AI_RESULT_INVALID', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (
    lower.includes('invalid media') ||
    lower.includes('could not open') ||
    lower.includes('unable to fetch scoring media') ||
    lower.includes('unable to verify') ||
    statusCode === 400
  ) {
    return makeAiError('AI_MEDIA_INVALID', context, {
      developerMessage: message,
      statusCode,
    });
  }
  if (context.operation === 'moderation') {
    return makeAiError('AI_MODERATION_FAILED', context, {
      developerMessage: message,
      statusCode,
    });
  }

  return makeAiError(
    statusCode && statusCode >= 500
      ? 'AI_SERVICE_UNAVAILABLE'
      : 'AI_SCORING_FAILED',
    context,
    {
      developerMessage: message,
      statusCode,
    },
  );
};

const isTimeoutMessage = (message: string): boolean =>
  message.includes('timeout') ||
  message.includes('timed out') ||
  message.includes('aborterror') ||
  message.includes('the operation was aborted');

const isConnectionMessage = (message: string): boolean =>
  message.includes('fetch failed') ||
  message.includes('econnrefused') ||
  message.includes('enotfound') ||
  message.includes('eai_again') ||
  message.includes('connection refused') ||
  message.includes('service url is not set') ||
  message.includes('must be set');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const readRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;
