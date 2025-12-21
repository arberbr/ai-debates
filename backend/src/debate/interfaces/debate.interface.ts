export interface DebateMessage {
  role: 'yes' | 'no';
  model: string;
  content: string;
  round: number;
  timestamp: string;
}

export interface JudgeEvaluation {
  judgeModel: string;
  evaluation: string;
  winner?: 'yes' | 'no' | 'tie';
  scores?: {
    yes: number;
    no: number;
  };
  reasoning: string;
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

export interface DebateResult {
  debateId: string;
  topic: string;
  title: string;
  yesModel: string;
  noModel: string;
  openingStatements: OpeningStatements;
  rounds: DebateRound[];
  conclusions: Conclusions;
  judgeEvaluations: JudgeEvaluation[];
  finalWinner?: 'yes' | 'no' | 'tie';
  aggregateScore?: {
    yes: number;
    no: number;
  };
  usage?: UsageData;
}

export type DebateStage =
  | 'stream_start'
  | 'title_generation_start'
  | 'title_generation_complete'
  | 'opening_statements_start'
  | 'opening_statements_complete'
  | 'rebuttals_start'
  | 'rebuttal_round_start'
  | 'rebuttal_round_complete'
  | 'rebuttals_complete'
  | 'conclusions_start'
  | 'conclusions_complete'
  | 'judging_start'
  | 'judge_complete'
  | 'judging_complete'
  | 'complete'
  | 'error';

export interface DebateStatus {
  stage: DebateStage;
  data?: any;
  message?: string;
  timestamp: string;
}
