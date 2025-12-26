import { useMemo, useReducer } from "react";
import type {
  Conclusions,
  DebateRound,
  FinalResult,
  JudgeEvaluation,
  OpeningStatements,
  UsageData,
} from "@/lib/types";

// State definition
export interface DebateState {
  status: string;
  displayTopic: string;
  openingStatements: OpeningStatements | null;
  debateRounds: DebateRound[];
  conclusions: Conclusions | null;
  judgeEvaluations: JudgeEvaluation[];
  finalResult: FinalResult | null;
  usage: UsageData | undefined;
  isComplete: boolean;
  error: string | null;
  yesModel: string;
  noModel: string;
}

// Initial state
export const initialDebateState: DebateState = {
  status: "Initializing...",
  displayTopic: "Debate Chat",
  openingStatements: null,
  debateRounds: [],
  conclusions: null,
  judgeEvaluations: [],
  finalResult: null,
  usage: undefined,
  isComplete: false,
  error: null,
  yesModel: "",
  noModel: "",
};

// Action types
type DebateAction =
  | { type: "SET_STATUS"; payload: string }
  | { type: "SET_TOPIC"; payload: string }
  | { type: "SET_MODELS"; payload: { yesModel: string; noModel: string } }
  | { type: "SET_OPENING_STATEMENTS"; payload: OpeningStatements }
  | { type: "ADD_ROUND"; payload: DebateRound }
  | { type: "SET_ROUNDS"; payload: DebateRound[] }
  | { type: "SET_CONCLUSIONS"; payload: Conclusions }
  | { type: "ADD_JUDGE_EVALUATION"; payload: JudgeEvaluation }
  | { type: "SET_JUDGE_EVALUATIONS"; payload: JudgeEvaluation[] }
  | { type: "SET_FINAL_RESULT"; payload: FinalResult }
  | { type: "SET_USAGE"; payload: UsageData }
  | { type: "SET_ERROR"; payload: string }
  | { type: "COMPLETE_DEBATE" }
  | { type: "RESET"; payload?: Partial<DebateState> };

// Reducer
function debateReducer(state: DebateState, action: DebateAction): DebateState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_TOPIC":
      return { ...state, displayTopic: action.payload };
    case "SET_MODELS":
      return {
        ...state,
        yesModel: action.payload.yesModel,
        noModel: action.payload.noModel,
      };
    case "SET_OPENING_STATEMENTS":
      return { ...state, openingStatements: action.payload };
    case "ADD_ROUND":
      return { ...state, debateRounds: [...state.debateRounds, action.payload] };
    case "SET_ROUNDS":
      return { ...state, debateRounds: action.payload };
    case "SET_CONCLUSIONS":
      return { ...state, conclusions: action.payload };
    case "ADD_JUDGE_EVALUATION":
      return { ...state, judgeEvaluations: [...state.judgeEvaluations, action.payload] };
    case "SET_JUDGE_EVALUATIONS":
      return { ...state, judgeEvaluations: action.payload };
    case "SET_FINAL_RESULT":
      return { ...state, finalResult: action.payload };
    case "SET_USAGE":
      return { ...state, usage: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, status: `Error: ${action.payload}` };
    case "COMPLETE_DEBATE":
      return { ...state, isComplete: true, status: "Debate process complete!" };
    case "RESET":
      return { ...initialDebateState, ...action.payload };
    default:
      return state;
  }
}

/**
 * Type for debate state actions
 */
export type DebateStateActions = {
  setStatus: (status: string) => void;
  setDisplayTopic: (topic: string) => void;
  setModels: (yesModel: string, noModel: string) => void;
  setOpeningStatements: (statements: OpeningStatements) => void;
  addRound: (round: DebateRound) => void;
  setRounds: (rounds: DebateRound[]) => void;
  setConclusions: (conclusions: Conclusions) => void;
  addJudgeEvaluation: (evaluation: JudgeEvaluation) => void;
  setJudgeEvaluations: (evaluations: JudgeEvaluation[]) => void;
  setFinalResult: (result: FinalResult) => void;
  setUsage: (usage: UsageData) => void;
  setError: (error: string) => void;
  completeDebate: () => void;
  resetState: (initialOverride?: Partial<DebateState>) => void;
};

/**
 * Custom hook for managing debate state
 */
export function useDebateState() {
  const [state, dispatch] = useReducer(debateReducer, initialDebateState);

  // Use stable dispatch reference - actions don't need individual useCallback
  // since dispatch is stable from useReducer
  const actions = useMemo(
    (): DebateStateActions => ({
      setStatus: (status: string) => dispatch({ type: "SET_STATUS", payload: status }),
      setDisplayTopic: (topic: string) => dispatch({ type: "SET_TOPIC", payload: topic }),
      setModels: (yesModel: string, noModel: string) =>
        dispatch({ type: "SET_MODELS", payload: { yesModel, noModel } }),
      setOpeningStatements: (statements: OpeningStatements) =>
        dispatch({ type: "SET_OPENING_STATEMENTS", payload: statements }),
      addRound: (round: DebateRound) => dispatch({ type: "ADD_ROUND", payload: round }),
      setRounds: (rounds: DebateRound[]) => dispatch({ type: "SET_ROUNDS", payload: rounds }),
      setConclusions: (conclusions: Conclusions) =>
        dispatch({ type: "SET_CONCLUSIONS", payload: conclusions }),
      addJudgeEvaluation: (evaluation: JudgeEvaluation) =>
        dispatch({ type: "ADD_JUDGE_EVALUATION", payload: evaluation }),
      setJudgeEvaluations: (evaluations: JudgeEvaluation[]) =>
        dispatch({ type: "SET_JUDGE_EVALUATIONS", payload: evaluations }),
      setFinalResult: (result: FinalResult) =>
        dispatch({ type: "SET_FINAL_RESULT", payload: result }),
      setUsage: (usage: UsageData) => dispatch({ type: "SET_USAGE", payload: usage }),
      setError: (error: string) => dispatch({ type: "SET_ERROR", payload: error }),
      completeDebate: () => dispatch({ type: "COMPLETE_DEBATE" }),
      resetState: (initialOverride?: Partial<DebateState>) =>
        dispatch({ type: "RESET", payload: initialOverride }),
    }),
    [] // Empty deps - dispatch is stable and actions are pure wrappers
  );

  return {
    state,
    dispatch,
    actions,
  };
}
