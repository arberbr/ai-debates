import { useCallback, useEffect, useRef } from "react";
import { ApiError, apiClient, createDebateStartConfig } from "@/lib/api-client";
import { SSE_BUFFER, STORAGE_KEYS, TIMING } from "@/lib/constants";
import { isAuthError as checkAuthError } from "@/lib/error-utils";
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
export type SSEEventData =
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

interface UseDebateConnectionOptions {
  debateId: string;
  onEvent: (event: SSEEventData) => void;
  onError: (error: string) => void;
  clearApiKey?: () => void;
}

/**
 * Result of parsing SSE buffer
 */
interface ParseSSEBufferResult {
  events: SSEEventData[];
  remainingBuffer: string;
}

/**
 * Parses SSE buffer and extracts complete event messages
 * Handles edge case where last line is a complete data message without trailing newline
 * @param buffer - Current SSE buffer string
 * @returns Object with parsed events and remaining buffer
 */
function parseSSEBuffer(buffer: string): ParseSSEBufferResult {
  const events: SSEEventData[] = [];
  const DATA_PREFIX = "data: ";

  if (!buffer) {
    return { events, remainingBuffer: "" };
  }

  const lines = buffer.split("\n");
  const lastLine = lines[lines.length - 1];
  const isLastLineIncomplete = lastLine.startsWith(DATA_PREFIX) && !lastLine.endsWith("\n");

  // Process complete lines (exclude potentially incomplete last line)
  const linesToProcess = isLastLineIncomplete ? lines.slice(0, -1) : lines;

  for (const line of linesToProcess) {
    if (line.startsWith(DATA_PREFIX)) {
      try {
        const jsonString = line.slice(DATA_PREFIX.length);
        const parsed = JSON.parse(jsonString) as SSEEventData;
        events.push(parsed);
      } catch (e) {
        console.error("Error parsing SSE data:", e, "Line:", line);
      }
    }
  }

  // Handle potentially incomplete last line
  const remainingBuffer = isLastLineIncomplete ? lastLine : "";

  return { events, remainingBuffer };
}

/**
 * Checks if an error indicates an authentication/authorization issue
 * @param error - Error instance or error message
 * @returns True if error is an auth error
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isAuthError;
  }

  // Use centralized error utility
  return checkAuthError(error);
}

/**
 * Custom hook for managing the debate SSE connection logic
 */
export function useDebateConnection({
  debateId,
  onEvent,
  onError,
  clearApiKey,
}: UseDebateConnectionOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeDebateIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConfigRef = useRef<{ config: DebateConfig; title: string; apiKey: string } | null>(
    null
  );
  const startConnectionInternalRef = useRef<
    | ((
        config: DebateConfig,
        title: string,
        apiKey: string,
        isReconnect?: boolean
      ) => Promise<void>)
    | null
  >(null);
  const { setItem, getItem } = useLocalStorage();

  // Keep callback refs updated
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const clearApiKeyRef = useRef(clearApiKey);

  useEffect(() => {
    onEventRef.current = onEvent;
    onErrorRef.current = onError;
    clearApiKeyRef.current = clearApiKey;
  }, [onEvent, onError, clearApiKey]);

  /**
   * Attempts to reconnect to the SSE stream after a transient error
   */
  const attemptReconnect = useCallback(
    async (config: DebateConfig, title: string, apiKey: string) => {
      if (reconnectAttemptsRef.current >= TIMING.SSE_MAX_RECONNECT_ATTEMPTS) {
        const errorMessage =
          "Failed to reconnect after multiple attempts. Please try starting a new debate.";
        console.error(errorMessage);
        onErrorRef.current(errorMessage);
        onEventRef.current({ stage: "error", message: errorMessage });
        reconnectAttemptsRef.current = 0;
        return;
      }

      reconnectAttemptsRef.current++;
      const delay = TIMING.SSE_RECONNECT_BASE_DELAY * reconnectAttemptsRef.current;

      onEventRef.current({
        stage: "status_update",
        message: `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${TIMING.SSE_MAX_RECONNECT_ATTEMPTS})`,
      });

      reconnectTimeoutRef.current = setTimeout(async () => {
        try {
          const startFn = startConnectionInternalRef.current;
          if (startFn) {
            await startFn(config, title, apiKey, true);
            // Reset attempts on successful reconnection
            reconnectAttemptsRef.current = 0;
          }
        } catch (error) {
          // Will trigger another reconnect attempt if it's a transient error
          console.error("Reconnection attempt failed:", error);
        }
      }, delay);
    },
    []
  );

  /**
   * Internal function to start the debate stream connection
   */
  const startConnectionInternal = useCallback(
    async (config: DebateConfig, title: string, apiKey: string, isReconnect = false) => {
      // Setup abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null; // Clear reference
      }
      abortControllerRef.current = new AbortController();
      activeDebateIdRef.current = debateId;

      // Store config for potential reconnection
      if (!isReconnect) {
        lastConfigRef.current = { config, title, apiKey };
        reconnectAttemptsRef.current = 0;
      }

      try {
        // Prepare config
        const startConfig = createDebateStartConfig({
          topic: config.topic,
          yesModel: config.yesModel,
          noModel: config.noModel,
          rounds: config.rounds,
          judgePrompt: config.judgePrompt,
          title,
          apiKey,
        });

        // Clean up pending debate entry
        try {
          const pending = getItem<Record<string, unknown>>(STORAGE_KEYS.PENDING_DEBATES, {});
          if (pending && typeof pending === "object") {
            // Create a copy to avoid mutating the original object from getItem if it's cached/frozen
            const updatedPending = { ...pending };
            delete updatedPending[debateId];
            setItem(STORAGE_KEYS.PENDING_DEBATES, updatedPending);
          }
        } catch (e) {
          console.error("Error cleaning up pending debate:", e);
        }

        const response = await apiClient.startDebateStream(
          startConfig,
          abortControllerRef.current.signal
        );

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";

        while (true) {
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Prevent buffer from growing unbounded (memory leak prevention)
          if (buffer.length > SSE_BUFFER.MAX_SIZE) {
            const errorMessage = "The debate stream encountered an error. Please try again.";
            console.error(
              `SSE buffer exceeded maximum size of ${SSE_BUFFER.MAX_SIZE} bytes. The stream may be malformed.`
            );
            onErrorRef.current(errorMessage);
            onEventRef.current({ stage: "error", message: errorMessage });
            break;
          }

          // Process buffer and extract complete SSE messages
          const result = parseSSEBuffer(buffer);
          buffer = result.remainingBuffer;

          // Emit parsed events
          for (const eventData of result.events) {
            onEventRef.current(eventData);
          }
        }
      } catch (err: unknown) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : "Failed to start debate";

        // Handle authentication errors - clear API key if auth error detected
        if (isAuthError(err)) {
          clearApiKeyRef.current?.();
          reconnectAttemptsRef.current = 0;
          onErrorRef.current(errorMessage);
          onEventRef.current({ stage: "error", message: errorMessage });
          return;
        }

        // Check if error is transient (network errors, 5xx errors)
        const isTransientError =
          err instanceof Error &&
          (err.name === "TypeError" || // Network errors
            err.message.includes("fetch") ||
            err.message.includes("network") ||
            (err instanceof ApiError && err.status >= 500));

        if (isTransientError && lastConfigRef.current && !isReconnect) {
          // Attempt reconnection for transient errors
          console.warn("Transient error detected, attempting reconnection:", err);
          await attemptReconnect(
            lastConfigRef.current.config,
            lastConfigRef.current.title,
            lastConfigRef.current.apiKey
          );
        } else {
          // Non-transient error or reconnection failed
          console.error("Debate connection error:", err);
          reconnectAttemptsRef.current = 0;
          onErrorRef.current(errorMessage);
          onEventRef.current({ stage: "error", message: errorMessage });
        }
      } finally {
        // Cleanup if this was the active connection
        if (activeDebateIdRef.current === debateId) {
          activeDebateIdRef.current = null;
        }
      }
    },
    [debateId, getItem, setItem, attemptReconnect]
  );

  // Keep ref updated
  useEffect(() => {
    startConnectionInternalRef.current = startConnectionInternal;
  }, [startConnectionInternal]);

  /**
   * Start the debate stream
   */
  const startConnection = useCallback(
    async (config: DebateConfig, title: string, apiKey: string) => {
      await startConnectionInternal(config, title, apiKey, false);
    },
    [startConnectionInternal]
  );

  /**
   * Cancel the current connection
   */
  const cancelConnection = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    activeDebateIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    lastConfigRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelConnection();
    };
  }, [cancelConnection]);

  return {
    startConnection,
    cancelConnection,
  };
}
