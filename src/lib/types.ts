/**
 * Shared TypeScript types and interfaces
 */

export interface UsageData {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  cost_details?: {
    upstream_inference_cost?: number;
    upstream_inference_input_cost?: number;
    upstream_inference_output_cost?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
  };
}

export interface DebateMessage {
  role: "yes" | "no";
  model: string;
  content: string;
  round: number;
  timestamp: string;
}

export interface OpeningStatements {
  yesStatement: DebateMessage;
  noStatement: DebateMessage;
}

export interface DebateRound {
  round: number;
  yesMessage: DebateMessage;
  noMessage: DebateMessage;
}

export interface Conclusions {
  yesConclusion: DebateMessage;
  noConclusion: DebateMessage;
}

export interface JudgeEvaluation {
  judgeModel: string;
  evaluation: string;
  winner?: "yes" | "no" | "tie";
  scores?: { yes: number; no: number };
  reasoning: string;
}

export interface FinalResult {
  winner?: "yes" | "no" | "tie";
  aggregateScore?: { yes: number; no: number };
}

export interface SavedDebate {
  debateId: string;
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: string;
  judgePrompt: string;
  openingStatements?: OpeningStatements;
  debateRounds: DebateRound[];
  conclusions?: Conclusions;
  judgeEvaluations: JudgeEvaluation[];
  finalResult: FinalResult | null;
  usage?: UsageData;
  timestamp: string;
}

export interface DebateConfig {
  debateId: string;
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: string;
  judgePrompt: string;
  timestamp: string;
}
