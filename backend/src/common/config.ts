/**
 * Configuration for the LLM Council.
 */

// Default council members - list of OpenRouter model identifiers
export const COUNCIL_MODELS = [
  'openai/gpt-5.2',
  'google/gemini-3-pro-preview',
  'anthropic/claude-sonnet-4.5',
];

// Chairman model - synthesizes final response
export const CHAIRMAN_MODEL = 'openai/gpt-5.2';

// Debate configuration
export const DEBATE_CONFIG = {
  timeouts: {
    titleGeneration: 10000,
    openingStatements: 180000,
    rebuttals: 180000,
    conclusions: 180000,
    judgeEvaluation: 120000,
    overallDebate: 30 * 60 * 1000, // 30 minutes
  },
  judgeModels: [
    'openai/gpt-5.2',
    'anthropic/claude-sonnet-4.5',
    'google/gemini-3-pro-preview',
  ],
  titleModel: 'mistralai/ministral-14b-2512',
  tieThreshold: 5,
} as const;