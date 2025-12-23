import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { DEBATE_CONFIG } from "@/lib/constants";
import { cleanString } from "@/lib/debate-utils";

/**
 * Custom hook for debate title generation logic
 */
export function useTitleGeneration() {
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
   * Generate title using API with fallback
   */
  const generateTitle = useCallback(
    async (topic: string, apiKey: string, signal?: AbortSignal): Promise<string> => {
      try {
        const titleResult = await apiClient.generateTitle(topic, apiKey, signal);

        if (titleResult) {
          return cleanString(titleResult);
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn("Title generation failed, using fallback:", error);
      }

      return generateFallbackTitle(topic);
    },
    [generateFallbackTitle]
  );

  return {
    generateTitle,
    generateFallbackTitle,
  };
}
