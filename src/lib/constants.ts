/**
 * Shared constants used across the application
 */

export const MODEL_OPTIONS = [
  { slug: "anthropic/claude-haiku-4.5", name: "Anthropic: Claude Haiku 4.5" },
  { slug: "anthropic/claude-sonnet-4.5", name: "Anthropic: Claude Sonnet 4.5" },
  { slug: "deepseek/deepseek-v3.2", name: "DeepSeek: DeepSeek V3.2" },
  { slug: "google/gemini-3-flash-preview", name: "Google: Gemini 3 Flash Preview" },
  { slug: "google/gemini-3-pro-preview", name: "Google: Gemini 3 Pro Preview" },
  { slug: "openai/gpt-5.2", name: "OpenAI: GPT-5.2" },
  { slug: "x-ai/grok-4", name: "xAI: Grok 4" },
  { slug: "mistralai/mistral-medium-3.1", name: "Mistral: Mistral Medium 3.1" },
] as const;

export const STORAGE_KEYS = {
  API_KEY: "openrouter_api_key",
  SAVED_DEBATES: "saved_debates",
  PENDING_DEBATES: "pending_debates",
} as const;

export const DEBATE_CONFIG = {
  MAX_TOPIC_LENGTH: 300,
  DEFAULT_ROUNDS: 3,
  MAX_ROUNDS: 5,
  MIN_ROUNDS: 1,
  WORDS_PER_MINUTE: 200,
  /** Maximum length for topic fallback title */
  FALLBACK_TITLE_LENGTH: 80,
  /** Maximum length for error message display */
  ERROR_MESSAGE_MAX_LENGTH: 200,
} as const;

export const STORAGE_QUOTA = {
  MAX_SIZE: 5 * 1024 * 1024,
} as const;

/**
 * Storage encoding constants
 */
export const STORAGE_ENCODING = {
  /** UTF-16 encoding uses 2 bytes per character */
  BYTES_PER_CHAR: 2,
} as const;

/**
 * Animation and timing constants
 */
export const TIMING = {
  /** Card unmount animation duration in milliseconds */
  CARD_UNMOUNT_DURATION: 300,
  /** API request timeout in milliseconds */
  API_TIMEOUT: 30000,
  /** Retry delay base for exponential backoff in milliseconds */
  RETRY_BASE_DELAY: 1000,
  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 3,
  /** Redirect delay after API key error in milliseconds */
  REDIRECT_DELAY: 3000,
  /** SSE reconnection delay base in milliseconds */
  SSE_RECONNECT_BASE_DELAY: 2000,
  /** Maximum SSE reconnection attempts */
  SSE_MAX_RECONNECT_ATTEMPTS: 3,
} as const;

/**
 * SSE buffer configuration
 */
export const SSE_BUFFER = {
  /** Maximum buffer size in bytes (1MB) */
  MAX_SIZE: 1024 * 1024,
} as const;

/**
 * Gets the API base URL from environment variable with environment-specific defaults.
 *
 * Environment variable: VITE_API_BASE_URL
 * - In Vite, environment variables must be prefixed with VITE_ to be exposed to client-side code
 *
 * Defaults:
 * - Development: http://localhost:3001
 * - Production: https://api.example.com (should be overridden via environment variable)
 *
 * Validates URL format at runtime and warns if using HTTP in production.
 *
 * @returns The API base URL
 * @example
 * // Development
 * // VITE_API_BASE_URL not set -> "http://localhost:3001"
 *
 * // Production
 * // VITE_API_BASE_URL=https://api.example.com -> "https://api.example.com"
 * // VITE_API_BASE_URL not set -> warns and uses default
 */
export const getApiBaseUrl = (): string => {
  const isProduction = import.meta.env.PROD;
  const defaultDevUrl = "http://localhost:3001";
  const defaultProdUrl = "https://api.example.com"; // Should be overridden in production

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const url = envUrl || (isProduction ? defaultProdUrl : defaultDevUrl);

  try {
    const urlObj = new URL(url);

    // Validate URL format and warn if using HTTP in production
    if (isProduction && urlObj.protocol === "http:") {
      console.warn(
        "[getApiBaseUrl] WARNING: Using HTTP in production is insecure. " +
          "Please set VITE_API_BASE_URL to an HTTPS URL. " +
          "Using HTTP is not recommended for production environments."
      );
    }

    // Warn if using default production URL
    if (isProduction && !envUrl) {
      console.warn(
        "[getApiBaseUrl] VITE_API_BASE_URL is not set. " +
          "Please set this environment variable in production. " +
          `Using default: ${defaultProdUrl}`
      );
    }

    return url;
  } catch {
    console.warn(`[getApiBaseUrl] Invalid API base URL: "${url}", using default: ${defaultDevUrl}`);
    return defaultDevUrl;
  }
};
