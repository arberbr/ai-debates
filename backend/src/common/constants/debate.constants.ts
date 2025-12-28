/**
 * Constants used throughout the debate module.
 * Centralizes magic numbers and strings for better maintainability.
 */

export const DEBATE_CONSTANTS = {
  TOPIC: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 300,
  },
  MODEL: {
    MAX_LENGTH: 100,
  },
  JUDGE_PROMPT: {
    MAX_LENGTH: 2000,
  },
  TITLE: {
    MAX_LENGTH: 200,
  },
  AUTH: {
    BEARER_PREFIX: 'Bearer',
    HEADER_NAME: 'authorization',
  },
  STATUS: {
    MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  },
  SSE: {
    EVENT_PREFIX: 'data: ',
    EVENT_SUFFIX: '\n\n',
    HEADERS: {
      CONTENT_TYPE: 'text/event-stream',
      CACHE_CONTROL: 'no-cache',
      CONNECTION: 'keep-alive',
      X_ACCEL_BUFFERING: 'no',
    },
  },
  ROUNDS: {
    MIN: 1,
    MAX: 5,
  },
} as const;
