/**
 * Shared constants used across the application
 */

export const MODEL_OPTIONS = [
  { slug: 'anthropic/claude-haiku-4.5', name: 'Anthropic: Claude Haiku 4.5' },
  { slug: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5' },
  { slug: 'deepseek/deepseek-v3.2', name: 'DeepSeek: DeepSeek V3.2' },
  { slug: 'google/gemini-3-flash-preview', name: 'Google: Gemini 3 Flash Preview' },
  { slug: 'google/gemini-3-pro-preview', name: 'Google: Gemini 3 Pro Preview' },
  { slug: 'openai/gpt-5.2', name: 'OpenAI: GPT-5.2' },
  { slug: 'x-ai/grok-4', name: 'xAI: Grok 4' },
  { slug: 'mistralai/mistral-medium-3.1', name: 'Mistral: Mistral Medium 3.1' },
  { slug: 'minimax/minimax-01', name: 'MiniMax: MiniMax-01' },
  { slug: 'allenai/olmo-3.1-32b-think:free', name: 'AllenAI: Olmo 3.1 32B Think (free)' },
] as const

export const STORAGE_KEYS = {
  API_KEY: 'openrouter_api_key',
  SAVED_DEBATES: 'saved_debates',
  PENDING_DEBATES: 'pending_debates',
} as const

export const DEBATE_CONFIG = {
  MAX_TOPIC_LENGTH: 300,
  DEFAULT_ROUNDS: 3,
  MAX_ROUNDS: 5,
  MIN_ROUNDS: 1,
  WORDS_PER_MINUTE: 200,
} as const

/**
 * Gets the API base URL from environment variable or defaults to localhost:3001
 * In Vite, environment variables must be prefixed with VITE_ to be exposed to client-side code
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
}

