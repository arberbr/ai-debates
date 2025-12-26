import { useCallback, useEffect, useRef } from "react";
import type { DebateConfig } from "@/lib/types";
import { type SSEEventData, useDebateConnection } from "./useDebateConnection";
import { useDebateInitialization } from "./useDebateInitialization";
import { useDebateState } from "./useDebateState";

interface UseDebateStreamOptions {
  debateConfig: DebateConfig | null;
  debateId: string;
  onError?: (error: string) => void;
  clearApiKey?: () => void;
  onComplete?: () => void;
}

/**
 * Custom hook for managing debate SSE stream.
 *
 * Refactored to compose smaller hooks:
 * - useDebateState: Manages complex state with a reducer
 * - useTitleGeneration: Handles title API calls and fallbacks
 * - useDebateConnection: Handles SSE streaming and connection logic
 */
export function useDebateStream({
  debateConfig,
  debateId,
  onError,
  clearApiKey,
  onComplete,
}: UseDebateStreamOptions) {
  // 1. State Management
  const { state, actions } = useDebateState();

  // 2. Connection Handling
  const hasStartedRef = useRef(false);
  const startedDebateIdRef = useRef<string | null>(null);

  // 3. Connection Handling
  const handleEvent = useCallback(
    (data: SSEEventData) => {
      switch (data.stage) {
        case "stream_start":
          actions.setStatus("Stream initialized...");
          break;
        case "opening_statements_start":
          actions.setStatus(data.message || "Generating opening statements...");
          break;
        case "opening_statements_complete":
          actions.setOpeningStatements(data.data);
          actions.setStatus("Opening statements complete");
          break;
        case "rebuttals_start":
          actions.setStatus(data.message || "Starting rebuttal rounds...");
          break;
        case "rebuttal_round_start":
          actions.setStatus(data.message || `Starting rebuttal round ${data.data.round}...`);
          break;
        case "rebuttal_round_complete":
          actions.addRound(data.data);
          actions.setStatus(`Rebuttal round ${data.data.round} complete`);
          break;
        case "rebuttals_complete":
          actions.setStatus("All rebuttal rounds complete");
          break;
        case "conclusions_start":
          actions.setStatus(data.message || "Generating conclusions...");
          break;
        case "conclusions_complete":
          actions.setConclusions(data.data);
          actions.setStatus("Conclusions complete");
          break;
        case "judging_start":
          actions.setStatus("Judges evaluating debate...");
          break;
        case "judging_progress":
          actions.setStatus(data.message || "Judges evaluating...");
          break;
        case "judge_complete":
          actions.addJudgeEvaluation(data.data);
          actions.setStatus(`Judge ${data.data.judgeModel} evaluation complete`);
          break;
        case "judging_complete":
          actions.setFinalResult(data.data.finalResult);
          actions.setStatus("All evaluations complete");
          break;
        case "complete": {
          actions.completeDebate();
          const completeData = data.data;

          // Update state with any missing data from complete event
          if (completeData.yesModel || completeData.noModel) {
            // Only update if we have new info, to avoid overwriting existing
            const newYes = completeData.yesModel || state.yesModel;
            const newNo = completeData.noModel || state.noModel;
            if (newYes !== state.yesModel || newNo !== state.noModel) {
              actions.setModels(newYes, newNo);
            }
          }

          if (completeData.openingStatements)
            actions.setOpeningStatements(completeData.openingStatements);
          if (completeData.rounds && Array.isArray(completeData.rounds))
            actions.setRounds(completeData.rounds);
          if (completeData.conclusions) actions.setConclusions(completeData.conclusions);
          if (completeData.judgeEvaluations)
            actions.setJudgeEvaluations(completeData.judgeEvaluations);
          if (completeData.finalResult) actions.setFinalResult(completeData.finalResult);
          if (completeData.title) actions.setDisplayTopic(completeData.title);
          if (completeData.usage) actions.setUsage(completeData.usage);

          onComplete?.();
          break;
        }
        case "status_update":
          if (data.message) actions.setStatus(data.message);
          break;
        case "error":
          // Error handling is mostly done in useDebateConnection onError callback
          // but we can ensure state is updated here if needed
          break;
      }
    },
    [actions, state.yesModel, state.noModel, onComplete]
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      actions.setError(errorMessage);
      onError?.(errorMessage);
    },
    [actions, onError]
  );

  const { startConnection, cancelConnection } = useDebateConnection({
    debateId,
    onEvent: handleEvent,
    onError: handleError,
    clearApiKey,
  });

  // 4. Initialization Logic
  const { initializeDebate, validateAndGetApiKey, validateDebateConfig, isInitializing } =
    useDebateInitialization({
      actions,
      startConnection,
      onError: handleError,
    });

  // Start Debate Logic
  useEffect(() => {
    // Basic guards
    if (!debateConfig || state.isComplete) return;
    if (debateConfig.debateId !== debateId) return;

    // Atomic check-and-set to prevent race conditions
    // If already started for this debate, skip
    if (hasStartedRef.current && startedDebateIdRef.current === debateId) return;
    // If currently initializing, skip
    if (isInitializing()) return;

    // Atomically claim initialization
    hasStartedRef.current = true;
    startedDebateIdRef.current = debateId;

    // Validate config
    if (!validateDebateConfig(debateConfig)) {
      hasStartedRef.current = false;
      startedDebateIdRef.current = null;
      return;
    }

    actions.setModels(debateConfig.yesModel, debateConfig.noModel);

    // Get and validate API Key
    const apiKey = validateAndGetApiKey();
    if (!apiKey) {
      hasStartedRef.current = false;
      startedDebateIdRef.current = null;
      return;
    }

    // Start async initialization
    initializeDebate(debateConfig, apiKey).catch((error) => {
      console.error("Failed to initialize debate:", error);
      hasStartedRef.current = false;
      startedDebateIdRef.current = null;
    });

    // Cleanup
    return () => {
      cancelConnection();
      // Only reset if this is the debate we started
      if (startedDebateIdRef.current === debateId) {
        hasStartedRef.current = false;
        startedDebateIdRef.current = null;
      }
    };
  }, [
    debateConfig,
    debateId,
    state.isComplete,
    actions,
    cancelConnection,
    validateDebateConfig,
    validateAndGetApiKey,
    initializeDebate,
    isInitializing,
  ]);

  // Return the public interface expected by components
  return {
    status: state.status,
    displayTopic: state.displayTopic,
    openingStatements: state.openingStatements,
    debateRounds: state.debateRounds,
    conclusions: state.conclusions,
    judgeEvaluations: state.judgeEvaluations,
    finalResult: state.finalResult,
    usage: state.usage,
    isComplete: state.isComplete,
    error: state.error,
    yesModel: state.yesModel,
    noModel: state.noModel,
  };
}
