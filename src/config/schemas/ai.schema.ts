import * as Yup from 'yup';

export const aiSchema = Yup.object({
  USE_MOCK_AI: Yup.string()
    .oneOf(['true', 'false'], 'USE_MOCK_AI must be "true" or "false"')
    .default('true'),

  AI_MODEL_API_URL: Yup.string()
    .url('AI_MODEL_API_URL must be a valid URL')
    .when('USE_MOCK_AI', {
      is: 'false',
      then: schema =>
        schema.required(
          'AI_MODEL_API_URL is required when USE_MOCK_AI is false',
        ),
      otherwise: schema => schema.optional(),
    }),

  AI_MODEL_API_KEY: Yup.string()
    .min(10, 'AI_MODEL_API_KEY must be at least 10 characters')
    .when('USE_MOCK_AI', {
      is: 'false',
      then: schema =>
        schema
          .required('AI_MODEL_API_KEY is required when USE_MOCK_AI is false')
          .notOneOf(
            ['your_ai_api_key_here', 'api_key', 'key'],
            'AI_MODEL_API_KEY is too weak or is a placeholder',
          ),
      otherwise: schema => schema.optional(),
    }),

  AI_MODEL_TIMEOUT_MS: Yup.number()
    .transform((_, orig) =>
      orig === undefined || orig === '' ? undefined : Number(orig),
    )
    .min(1000, 'AI_MODEL_TIMEOUT_MS must be at least 1000ms')
    .default(120000),
});
