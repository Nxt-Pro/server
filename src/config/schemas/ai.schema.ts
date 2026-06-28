import * as Yup from 'yup';

import { yupUrl } from '@/common/validators/url.validator';

export const aiSchema = Yup.object({
  AI_SCORING_ENABLED: Yup.string()
    .oneOf(['true', 'false'], 'AI_SCORING_ENABLED must be "true" or "false"')
    .default('false'),

  AI_SCORING_QUEUE_ENABLED: Yup.string()
    .oneOf(
      ['true', 'false'],
      'AI_SCORING_QUEUE_ENABLED must be "true" or "false"',
    )
    .default('true'),

  AI_SKILL_SERVICE_URL: yupUrl(
    Yup.string(),
    'AI_SKILL_SERVICE_URL must be a valid URL',
  ).when('AI_SCORING_ENABLED', {
    is: 'true',
    then: schema =>
      schema.required(
        'AI_SKILL_SERVICE_URL is required when AI_SCORING_ENABLED is true',
      ),
    otherwise: schema => schema.optional(),
  }),

  AI_MODERATION_SERVICE_URL: yupUrl(
    Yup.string(),
    'AI_MODERATION_SERVICE_URL must be a valid URL',
  ).optional(),

  AI_RECOMMENDATION_SERVICE_URL: yupUrl(
    Yup.string(),
    'AI_RECOMMENDATION_SERVICE_URL must be a valid URL',
  ).optional(),

  AI_SERVICE_TIMEOUT_MS: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1000, 'AI_SERVICE_TIMEOUT_MS must be at least 1000ms')
    .default(120000),

  AI_SERVICE_RETRY_ATTEMPTS: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1, 'AI_SERVICE_RETRY_ATTEMPTS must be at least 1')
    .default(3),

  AI_SCORING_MAX_MEDIA_BYTES: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1_048_576, 'AI_SCORING_MAX_MEDIA_BYTES must be at least 1 MiB')
    .default(104_857_600),

  USE_MOCK_AI: Yup.string()
    .oneOf(['true', 'false'], 'USE_MOCK_AI must be "true" or "false"')
    .default('false'),

  AI_MODEL_API_URL: yupUrl(
    Yup.string(),
    'AI_MODEL_API_URL must be a valid URL',
  ).optional(),

  AI_MODEL_API_KEY: Yup.string().optional(),

  AI_MODEL_TIMEOUT_MS: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1000, 'AI_MODEL_TIMEOUT_MS must be at least 1000ms')
    .default(120000),
});
