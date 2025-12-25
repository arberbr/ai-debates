import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DebateConfig, SavedDebate } from "@/lib/types";
import { useDebates } from "./useDebates";

interface UseDebateSaveOptions {
  debateId: string;
  savedDebateState: SavedDebate | null;
  displayData: {
    isComplete: boolean;
    debateRounds: unknown[];
    openingStatements?: unknown;
    conclusions?: unknown;
    yesModel?: string;
    noModel?: string;
    displayTopic: string;
    judgeEvaluations: unknown[];
    finalResult: unknown;
    usage?: unknown;
  };
  debateConfig: DebateConfig | null;
}

/**
 * Custom hook to handle saving debate when it completes.
 * Prevents saving duplicates and handles errors gracefully.
 */
export function useDebateSave({
  debateId,
  savedDebateState,
  displayData,
  debateConfig,
}: UseDebateSaveOptions) {
  const { saveDebate } = useDebates();
  const hasSavedRef = useRef(false);

  useEffect(() => {
    // Prevent infinite loops: only save once when debate is complete
    if (
      hasSavedRef.current ||
      savedDebateState ||
      !displayData.isComplete ||
      (displayData.debateRounds.length === 0 &&
        !displayData.openingStatements &&
        !displayData.conclusions)
    ) {
      return;
    }

    /**
     * Type guard to check if an object has the expected structure for opening statements
     */
    const hasOpeningStatements = (
      obj: unknown
    ): obj is { yesStatement?: { model?: string }; noStatement?: { model?: string } } => {
      return (
        typeof obj === "object" && obj !== null && ("yesStatement" in obj || "noStatement" in obj)
      );
    };

    /**
     * Type guard to check if an object has the expected structure for conclusions
     */
    const hasConclusions = (
      obj: unknown
    ): obj is { yesConclusion?: { model?: string }; noConclusion?: { model?: string } } => {
      return (
        typeof obj === "object" && obj !== null && ("yesConclusion" in obj || "noConclusion" in obj)
      );
    };

    // Determine models from multiple sources (priority: state > opening statements > conclusions > debateConfig)
    const openingStatements = hasOpeningStatements(displayData.openingStatements)
      ? displayData.openingStatements
      : null;
    const conclusions = hasConclusions(displayData.conclusions) ? displayData.conclusions : null;

    const determinedYesModel =
      displayData.yesModel ||
      openingStatements?.yesStatement?.model ||
      conclusions?.yesConclusion?.model ||
      debateConfig?.yesModel ||
      "";
    const determinedNoModel =
      displayData.noModel ||
      openingStatements?.noStatement?.model ||
      conclusions?.noConclusion?.model ||
      debateConfig?.noModel ||
      "";

    const savedDebate: SavedDebate = {
      debateId,
      topic: displayData.displayTopic || debateConfig?.topic || "",
      yesModel: determinedYesModel,
      noModel: determinedNoModel,
      rounds: debateConfig?.rounds || "3",
      judgePrompt: debateConfig?.judgePrompt || "",
      openingStatements: displayData.openingStatements as SavedDebate["openingStatements"],
      debateRounds: displayData.debateRounds as SavedDebate["debateRounds"],
      conclusions: displayData.conclusions as SavedDebate["conclusions"],
      judgeEvaluations: displayData.judgeEvaluations as SavedDebate["judgeEvaluations"],
      finalResult: (displayData.finalResult as SavedDebate["finalResult"]) || null,
      usage: displayData.usage as SavedDebate["usage"],
      timestamp: new Date().toISOString(),
    };

    try {
      saveDebate(savedDebate);
      hasSavedRef.current = true; // Mark as saved to prevent re-saving
    } catch (error) {
      console.error("Error saving debate:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save debate. Please try again.";
      toast.error(errorMessage);
    }
  }, [
    savedDebateState,
    displayData.isComplete,
    displayData.debateRounds,
    displayData.openingStatements,
    displayData.conclusions,
    displayData.yesModel,
    displayData.noModel,
    displayData.displayTopic,
    displayData.judgeEvaluations,
    displayData.finalResult,
    displayData.usage,
    debateId,
    debateConfig,
    saveDebate,
  ]);
}
