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

export interface DebateRound {
  round: number;
  yesMessage: DebateMessage;
  noMessage: DebateMessage;
}

export interface DebateResult {
  debateId: string;
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: DebateRound[];
  judgeEvaluations: JudgeEvaluation[];
  finalWinner?: 'yes' | 'no' | 'tie';
  aggregateScore?: {
    yes: number;
    no: number;
  };
}

export type DebateStage =
  | 'stream_start'
  | 'analysis_start'
  | 'analysis_complete'
  | 'debate_start'
  | 'round_start'
  | 'round_complete'
  | 'debate_complete'
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
