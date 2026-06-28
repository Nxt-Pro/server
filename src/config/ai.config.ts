export interface AiConfig {
  scoringEnabled: boolean;
  queueEnabled: boolean;
  skillServiceUrl?: string;
  moderationServiceUrl?: string;
  recommendationServiceUrl?: string;
  timeoutMs: number;
  retryAttempts: number;
  maxScoringMediaBytes: number;
  apiKey?: string;
  /** @deprecated kept only for legacy integration compatibility. */
  useMock: boolean;
  /** @deprecated use skillServiceUrl/moderationServiceUrl/recommendationServiceUrl. */
  apiUrl?: string;
}

export const aiConfig = (): AiConfig => ({
  scoringEnabled: process.env.AI_SCORING_ENABLED === 'true',
  queueEnabled: process.env.AI_SCORING_QUEUE_ENABLED !== 'false',
  skillServiceUrl:
    process.env.AI_SKILL_SERVICE_URL || process.env.AI_MODEL_API_URL,
  moderationServiceUrl:
    process.env.AI_MODERATION_SERVICE_URL || process.env.AI_MODEL_API_URL,
  recommendationServiceUrl: process.env.AI_RECOMMENDATION_SERVICE_URL,
  timeoutMs: parseInt(
    process.env.AI_SERVICE_TIMEOUT_MS ||
      process.env.AI_MODEL_TIMEOUT_MS ||
      '120000',
    10,
  ),
  retryAttempts: parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS || '3', 10),
  maxScoringMediaBytes: parseInt(
    process.env.AI_SCORING_MAX_MEDIA_BYTES || String(100 * 1024 * 1024),
    10,
  ),
  apiKey: process.env.AI_MODEL_API_KEY,
  useMock: process.env.USE_MOCK_AI === 'true',
  apiUrl: process.env.AI_MODEL_API_URL,
});
