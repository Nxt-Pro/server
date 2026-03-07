export interface AiConfig {
  useMock: boolean;
  apiUrl?: string;
  apiKey?: string;
}

export const aiConfig = (): AiConfig => ({
  useMock: process.env.USE_MOCK_AI === 'true',
  apiUrl: process.env.AI_MODEL_API_URL,
  apiKey: process.env.AI_MODEL_API_KEY,
});
