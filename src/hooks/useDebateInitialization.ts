import { useCallback, useRef } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { DebateConfig } from "@/lib/types";
import type { DebateStateActions } from "./useDebateState";
import { useLocalStorage } from "./useLocalStorage";
import { useTitleGeneration } from "./useTitleGeneration";

interface UseDebateInitializationOptions {
  actions: DebateStateActions;
  startConnection: (config: DebateConfig, title: string, apiKey: string) => Promise<void>;
  onError: (error: string) => void;
}

/**
 * Custom hook for handling debate initialization logic.
 * Separates initialization concerns from stream management.
 */
export function useDebateInitialization({
  actions,
  startConnection,
  onError,
}: UseDebateInitializationOptions) {
  const { getItemRaw } = useLocalStorage();
  const { generateTitle, generateFallbackTitle } = useTitleGeneration();
  const isInitializingRef = useRef(false);

  /**
   * Initializes the debate by generating title and starting the stream.
   */
  const initializeDebate = useCallback(
    async (config: DebateConfig, apiKey: string): Promise<void> => {
      if (isInitializingRef.current) {
        return;
      }

      isInitializingRef.current = true;

      try {
        // 1. Generate Title
        actions.setStatus("Generating title...");
        let title = await generateTitle(config.topic, apiKey);
        if (!title) {
          title = generateFallbackTitle(config.topic);
        }
        actions.setDisplayTopic(title);

        // 2. Start Stream
        actions.setStatus("Starting debate...");
        await startConnection(config, title, apiKey);
      } catch (error) {
        console.error("Error initializing debate:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize debate. Please try again.";
        onError(errorMessage);
        throw error;
      } finally {
        isInitializingRef.current = false;
      }
    },
    [actions, generateTitle, generateFallbackTitle, startConnection, onError]
  );

  /**
   * Validates API key from localStorage
   */
  const validateAndGetApiKey = useCallback((): string | null => {
    const storedApiKey = getItemRaw(STORAGE_KEYS.API_KEY);
    if (!storedApiKey?.trim()) {
      onError("OpenRouter API key is required. Please go back and enter your API key.");
      return null;
    }
    return storedApiKey.trim();
  }, [getItemRaw, onError]);

  /**
   * Validates debate configuration
   */
  const validateDebateConfig = useCallback(
    (config: DebateConfig | null): config is DebateConfig => {
      if (!config) {
        return false;
      }

      if (!config.topic || !config.yesModel || !config.noModel) {
        onError("Missing required debate parameters.");
        return false;
      }

      return true;
    },
    [onError]
  );

  return {
    initializeDebate,
    validateAndGetApiKey,
    validateDebateConfig,
    isInitializing: () => isInitializingRef.current,
  };
}
