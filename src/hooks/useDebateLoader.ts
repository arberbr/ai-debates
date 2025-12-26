import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { extractErrorMessage } from "@/lib/error-utils";
import { debateConfigSchema } from "@/lib/schemas";
import type { DebateConfig, SavedDebate } from "@/lib/types";
import { getCurrentTimestamp } from "@/lib/utils";
import { useLocalStorage } from "./useLocalStorage";

interface UseDebateLoaderResult {
  debateConfig: DebateConfig | null;
  savedDebateState: SavedDebate | null;
  configLoadError: string | null;
  isLoading: boolean;
}

/**
 * Custom hook for loading debate configuration and saved debate state.
 * Handles loading from both saved debates and pending debates in localStorage.
 */
export function useDebateLoader(debateId: string): UseDebateLoaderResult {
  const { getItem } = useLocalStorage();
  const [debateConfig, setDebateConfig] = useState<DebateConfig | null>(null);
  const [savedDebateState, setSavedDebateState] = useState<SavedDebate | null>(null);
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);

  /**
   * Loads saved debate from localStorage
   */
  const loadSavedDebate = useCallback((): SavedDebate | null => {
    try {
      const savedDebates = getItem<SavedDebate[]>(STORAGE_KEYS.SAVED_DEBATES, []);
      if (!savedDebates || !Array.isArray(savedDebates)) {
        return null;
      }

      const savedDebate = savedDebates.find((d) => d.debateId === debateId);
      if (savedDebate?.debateRounds && savedDebate.debateRounds.length > 0) {
        return savedDebate;
      }
    } catch (error) {
      console.error("Error loading saved debate:", error);
    }
    return null;
  }, [debateId, getItem]);

  /**
   * Loads and validates debate config from pending debates
   */
  const loadDebateConfig = useCallback((): DebateConfig | null => {
    try {
      const pendingDebates = getItem<Record<string, DebateConfig>>(
        STORAGE_KEYS.PENDING_DEBATES,
        {}
      );

      if (!pendingDebates || typeof pendingDebates !== "object") {
        setConfigLoadError("No pending debates found. Please start a new debate.");
        return null;
      }

      const rawConfig = pendingDebates[debateId] || null;
      if (!rawConfig) {
        setConfigLoadError(
          `No debate configuration found for ID: ${debateId}. Please start a new debate.`
        );
        return null;
      }

      // Validate config with Zod
      const validationResult = debateConfigSchema.safeParse(rawConfig);
      if (!validationResult.success) {
        setConfigLoadError(
          "Invalid debate configuration: missing required fields or invalid format."
        );
        console.error("Invalid config found:", {
          errors: validationResult.error.format(),
          config: rawConfig,
        });
        return null;
      }

      const config = validationResult.data;
      return {
        debateId: config.debateId || debateId,
        topic: config.topic,
        yesModel: config.yesModel,
        noModel: config.noModel,
        rounds: config.rounds || "3",
        judgePrompt: config.judgePrompt || "",
        timestamp: config.timestamp || getCurrentTimestamp(),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(
        error,
        "An unexpected error occurred while loading the debate."
      );
      setConfigLoadError(errorMessage);
      console.error("Error loading pending debate config:", error);
      return null;
    }
  }, [debateId, getItem]);

  useEffect(() => {
    setConfigLoadError(null);
    setDebateConfig(null);
    setSavedDebateState(null);

    // First, try to load saved debate
    const savedDebate = loadSavedDebate();
    if (savedDebate) {
      setSavedDebateState(savedDebate);
      return;
    }

    // If no saved debate, try to load config from pending debates
    const config = loadDebateConfig();
    if (config) {
      setDebateConfig(config);
    }
  }, [loadSavedDebate, loadDebateConfig]);

  const isLoading = !debateConfig && !savedDebateState && !configLoadError;

  return {
    debateConfig,
    savedDebateState,
    configLoadError,
    isLoading,
  };
}
