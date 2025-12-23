import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient, createDebateStartConfig } from "@/lib/api-client";
import { DEBATE_CONFIG, STORAGE_KEYS } from "@/lib/constants";
import { cleanString } from "@/lib/debate-utils";
import type {
  Conclusions,
  DebateConfig,
  DebateRound,
  FinalResult,
  JudgeEvaluation,
  OpeningStatements,
  UsageData,
} from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Type-safe SSE event data using discriminated unions
 */
type SSEEventData =
  | { stage: "stream_start" }
  | { stage: "opening_statements_start"; message?: string }
  | { stage: "opening_statements_complete"; data: OpeningStatements }
  | { stage: "rebuttals_start"; message?: string }
  | { stage: "rebuttal_round_start"; message?: string; data: { round: number } }
  | { stage: "rebuttal_round_complete"; data: DebateRound }
  | { stage: "rebuttals_complete" }
  | { stage: "conclusions_start"; message?: string }
  | { stage: "conclusions_complete"; data: Conclusions }
  | { stage: "judging_start" }
  | { stage: "judging_progress"; message?: string }
  | { stage: "judge_complete"; data: JudgeEvaluation }
  | { stage: "judging_complete"; data: { finalResult: FinalResult } }
  | {
      stage: "complete";
      data: {
        title?: string;
        yesModel?: string;
        noModel?: string;
        openingStatements?: OpeningStatements;
        rounds?: DebateRound[];
        conclusions?: Conclusions;
        judgeEvaluations?: JudgeEvaluation[];
        finalResult?: FinalResult;
        usage?: UsageData;
      };
    }
  | { stage: "status_update"; message: string }
  | { stage: "error"; message: string };

interface UseDebateStreamReturn {
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

interface UseDebateStreamOptions {
  debateConfig: DebateConfig | null;
  debateId: string;
  onError?: (error: string) => void;
  clearApiKey?: () => void;
  onComplete?: () => void;
}

/**
 * Custom hook for managing debate SSE stream
 * Handles connection, event processing, and state management
 */
export function useDebateStream({
  debateConfig,
  debateId,
  onError,
  clearApiKey,
  onComplete,
}: UseDebateStreamOptions): UseDebateStreamReturn {
  const [status, setStatus] = useState<string>("Initializing...");
  const [displayTopic, setDisplayTopic] = useState<string>("Debate Chat");
  const [openingStatements, setOpeningStatements] = useState<OpeningStatements | null>(null);
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [conclusions, setConclusions] = useState<Conclusions | null>(null);
  const [judgeEvaluations, setJudgeEvaluations] = useState<JudgeEvaluation[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [usage, setUsage] = useState<UsageData | undefined>(undefined);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yesModel, setYesModel] = useState<string>("");
  const [noModel, setNoModel] = useState<string>("");

  const hasStartedRef = useRef(false);
  const startedDebateIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startingDebateIdRef = useRef<string | null>(null); // Track which debateId is currently starting
  const activeDebateIdRef = useRef<string | null>(null); // Track the currently active debate
  const generateTitleAndStartDebateRef = useRef<
    ((config: DebateConfig, apiKey: string) => Promise<void>) | null
  >(null);
  const onErrorRef = useRef(onError);
  const { getItem, setItem, getItemRaw } = useLocalStorage();
  const getItemRawRef = useRef(getItemRaw);

  // Keep refs updated
  useEffect(() => {
    onErrorRef.current = onError;
    getItemRawRef.current = getItemRaw;
  }, [onError, getItemRaw]);

  /**
   * Handle SSE events with type-safe pattern matching
   */
  const handleSSEEvent = useCallback(
    (data: SSEEventData) => {
      switch (data.stage) {
        case "stream_start":
          setStatus("Stream initialized...");
          break;
        case "opening_statements_start":
          setStatus(data.message || "Generating opening statements...");
          break;
        case "opening_statements_complete":
          setOpeningStatements(data.data);
          setStatus("Opening statements complete");
          break;
        case "rebuttals_start":
          setStatus(data.message || "Starting rebuttal rounds...");
          break;
        case "rebuttal_round_start":
          setStatus(data.message || `Starting rebuttal round ${data.data.round}...`);
          break;
        case "rebuttal_round_complete":
          setDebateRounds((prev) => [...prev, data.data]);
          setStatus(`Rebuttal round ${data.data.round} complete`);
          break;
        case "rebuttals_complete":
          setStatus("All rebuttal rounds complete");
          break;
        case "conclusions_start":
          setStatus(data.message || "Generating conclusions...");
          break;
        case "conclusions_complete":
          setConclusions(data.data);
          setStatus("Conclusions complete");
          break;
        case "judging_start":
          setStatus("Judges evaluating debate...");
          break;
        case "judging_progress":
          setStatus(data.message || "Judges evaluating...");
          break;
        case "judge_complete":
          setJudgeEvaluations((prev) => [...prev, data.data]);
          setStatus(`Judge ${data.data.judgeModel} evaluation complete`);
          break;
        case "judging_complete":
          setFinalResult(data.data.finalResult);
          setStatus("All evaluations complete");
          break;
        case "complete": {
          setIsComplete(true);
          setStatus("Debate process complete!");
          const completeData = data.data;

          // Extract models with priority
          if (completeData.yesModel) setYesModel(completeData.yesModel);
          if (completeData.noModel) setNoModel(completeData.noModel);

          if (completeData.openingStatements) {
            setOpeningStatements(completeData.openingStatements);
            if (!completeData.yesModel && completeData.openingStatements.yesStatement?.model) {
              setYesModel(completeData.openingStatements.yesStatement.model);
            }
            if (!completeData.noModel && completeData.openingStatements.noStatement?.model) {
              setNoModel(completeData.openingStatements.noStatement.model);
            }
          }

          if (completeData.rounds && Array.isArray(completeData.rounds)) {
            setDebateRounds(completeData.rounds);
          }

          if (completeData.conclusions) {
            setConclusions(completeData.conclusions);
            if (!completeData.yesModel && completeData.conclusions.yesConclusion?.model) {
              setYesModel(completeData.conclusions.yesConclusion.model);
            }
            if (!completeData.noModel && completeData.conclusions.noConclusion?.model) {
              setNoModel(completeData.conclusions.noConclusion.model);
            }
          }

          if (completeData.judgeEvaluations) {
            setJudgeEvaluations(completeData.judgeEvaluations);
          }

          if (completeData.finalResult) {
            setFinalResult(completeData.finalResult);
          }

          if (completeData.title) {
            setDisplayTopic(cleanString(completeData.title));
          }

          if (completeData.usage) {
            setUsage(completeData.usage);
          }

          onComplete?.();
          break;
        }
        case "status_update":
          if (data.message) {
            setStatus(data.message);
          }
          break;
        case "error": {
          const errorMessage = data.message || "An error occurred";
          setError(errorMessage);
          setStatus(`Error: ${errorMessage} `);

          // Clear API key on OpenRouter errors (including 402 credit errors)
          if (
            (errorMessage.includes("OpenRouter") ||
              errorMessage.includes("API key") ||
              errorMessage.includes("401") ||
              errorMessage.includes("402") ||
              errorMessage.includes("403") ||
              errorMessage.includes("credits") ||
              errorMessage.includes("insufficient")) &&
            clearApiKey
          ) {
            clearApiKey();
          }
          onError?.(errorMessage);
          break;
        }
      }
    },
    [onError, clearApiKey, onComplete]
  );

  /**
   * Helper function to generate fallback title
   */
  const generateFallbackTitle = useCallback((topic: string): string => {
    const fallbackTitle = topic
      .split("\n")[0]
      .substring(0, DEBATE_CONFIG.FALLBACK_TITLE_LENGTH)
      .trim();
    return fallbackTitle.endsWith("...") ? fallbackTitle : `${fallbackTitle}...`;
  }, []);

  /**
   * Generate title and start debate stream
   */
  const generateTitleAndStartDebate = useCallback(
    async (config: DebateConfig, apiKey: string) => {
      const { topic, yesModel, noModel, rounds, judgePrompt } = config;

      // Check if this debate is still the active one
      if (activeDebateIdRef.current !== debateId) {
        return;
      }

      // Clean up pending debate entry once we start
      try {
        const pending = getItem<Record<string, unknown>>(STORAGE_KEYS.PENDING_DEBATES, {});
        if (pending && typeof pending === "object") {
          delete pending[debateId];
          setItem(STORAGE_KEYS.PENDING_DEBATES, pending);
        }
      } catch (e) {
        console.error("Error cleaning up pending debate:", e);
      }

      const abortController = abortControllerRef.current;
      if (!abortController || abortController.signal.aborted) {
        return;
      }

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        // Step 1: Generate title using API client
        setStatus("Generating title...");
        let generatedTitle: string | null = null;

        try {
          const titleResult = await apiClient.generateTitle(topic, apiKey, abortController.signal);

          if (titleResult) {
            const cleanedTitle = cleanString(titleResult);
            generatedTitle = cleanedTitle;
            setDisplayTopic(cleanedTitle);
            setStatus("Title generated. Starting debate...");
          } else {
            generatedTitle = generateFallbackTitle(topic);
            setDisplayTopic(generatedTitle);
            setStatus("Starting debate...");
          }
        } catch (titleError) {
          if (abortController.signal.aborted) {
            return;
          }
          console.warn("Title generation error:", titleError);
          generatedTitle = generateFallbackTitle(topic);
          setDisplayTopic(generatedTitle);
          setStatus("Starting debate...");
        }

        // Ensure we have a title before proceeding
        if (!generatedTitle) {
          generatedTitle = generateFallbackTitle(topic);
          setDisplayTopic(generatedTitle);
        }

        // Step 2: Start debate with SSE streaming using API client
        const startConfig = createDebateStartConfig({
          topic,
          yesModel,
          noModel,
          rounds,
          judgePrompt,
          title: generatedTitle,
          apiKey,
        });

        let response: Response;
        try {
          response = await apiClient.startDebateStream(startConfig, abortController.signal);
        } catch (err) {
          if (err instanceof ApiError) {
            if (err.isAuthError) {
              clearApiKey?.();
            }
            throw err;
          }
          throw err;
        }

        reader = response.body?.getReader() || null;
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";

        try {
          while (true) {
            if (abortController.signal.aborted) {
              break;
            }

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6)) as SSEEventData;
                  handleSSEEvent(parsed);
                } catch (e) {
                  console.error("Error parsing SSE data:", e);
                }
              }
            }
          }
        } finally {
          try {
            reader.cancel();
          } catch {
            // Ignore cancellation errors
          }
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : "Failed to start debate";
        setError(errorMessage);
        console.error("Debate error:", err);

        if (
          errorMessage.includes("OpenRouter") ||
          errorMessage.includes("API key") ||
          errorMessage.includes("401") ||
          errorMessage.includes("403")
        ) {
          clearApiKey?.();
        }
        onError?.(errorMessage);
      }
    },
    [debateId, handleSSEEvent, clearApiKey, onError, getItem, setItem, generateFallbackTitle]
  );

  // Keep the ref updated with the latest callback
  useEffect(() => {
    generateTitleAndStartDebateRef.current = generateTitleAndStartDebate;
  }, [generateTitleAndStartDebate]);

  // Start debate when config is loaded
  useEffect(() => {
    // Early return if no config or already complete
    if (!debateConfig || isComplete) {
      return;
    }

    // Early return if config's debateId doesn't match current debateId
    if (debateConfig.debateId !== debateId) {
      return;
    }

    // Early return if already started this debate
    if (startedDebateIdRef.current === debateId && hasStartedRef.current) {
      return;
    }

    // Early return if this debate is already starting
    if (startingDebateIdRef.current === debateId) {
      return;
    }

    // Early return if config is invalid
    if (!debateConfig.topic || !debateConfig.yesModel || !debateConfig.noModel) {
      console.error("Invalid debate config:", debateConfig);
      const errorMsg =
        "Missing required debate parameters. Please start a new debate from the home page.";
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      return;
    }

    // Atomically claim this debateId for starting (prevents concurrent starts)
    if (startingDebateIdRef.current !== null && startingDebateIdRef.current !== debateId) {
      // Another debate is starting, abort it first
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }

    // If this is a different debate, abort the previous one and reset state
    if (activeDebateIdRef.current !== null && activeDebateIdRef.current !== debateId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      hasStartedRef.current = false;
      startedDebateIdRef.current = null;
    }

    // Mark this debate as the active one
    activeDebateIdRef.current = debateId;
    startingDebateIdRef.current = debateId;

    // Mark this debate as started
    hasStartedRef.current = true;
    startedDebateIdRef.current = debateId;
    abortControllerRef.current = new AbortController();

    const storedApiKey = getItemRawRef.current(STORAGE_KEYS.API_KEY);

    if (!storedApiKey || !storedApiKey.trim()) {
      startingDebateIdRef.current = null;
      const errorMsg = "OpenRouter API key is required. Please go back and enter your API key.";
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      return;
    }

    const apiKey = storedApiKey.trim();
    const startFunction = generateTitleAndStartDebateRef.current;
    if (startFunction) {
      startFunction(debateConfig, apiKey).finally(() => {
        // Reset the starting flag when done (success or error)
        if (startingDebateIdRef.current === debateId) {
          startingDebateIdRef.current = null;
        }
      });
    } else {
      startingDebateIdRef.current = null;
    }

    // Cleanup: abort on unmount or when debateId changes
    return () => {
      // Abort if this is the active debate
      if (abortControllerRef.current && activeDebateIdRef.current === debateId) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset refs if this was the active debate
      if (activeDebateIdRef.current === debateId) {
        activeDebateIdRef.current = null;
        hasStartedRef.current = false;
        startedDebateIdRef.current = null;
      }
      // Reset starting flag if this was the starting debate
      if (startingDebateIdRef.current === debateId) {
        startingDebateIdRef.current = null;
      }
    };
    // Depend on debateConfig to react when it changes, but guards prevent duplicate runs
  }, [debateConfig, debateId, isComplete]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeDebateIdRef.current = null;
      hasStartedRef.current = false;
      startedDebateIdRef.current = null;
      startingDebateIdRef.current = null;
    };
  }, []);

  return {
    status,
    displayTopic,
    openingStatements,
    debateRounds,
    conclusions,
    judgeEvaluations,
    finalResult,
    usage,
    isComplete,
    error,
    yesModel,
    noModel,
  };
}
