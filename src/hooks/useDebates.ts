import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { STORAGE_KEYS } from "@/lib/constants";
import { savedDebateSchema } from "@/lib/schemas";
import type { SavedDebate } from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Custom hook for managing saved debates in localStorage.
 * Handles loading, saving, deletion, and cross-tab synchronization.
 * @returns Object containing debates list and management functions
 */
export function useDebates() {
  const [debates, setDebates] = useState<SavedDebate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getItem, setItem, checkQuotaBeforeWrite, getStorageStats } = useLocalStorage();

  /**
   * Validates and sorts debates array
   */
  const validateAndSortDebates = useCallback(
    (saved: unknown): SavedDebate[] => {
      // Validate with Zod
      const result = z.array(savedDebateSchema).safeParse(saved);

      if (result.success) {
        const validatedDebates = result.data;
        // Sort by timestamp, most recent first
        validatedDebates.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return validatedDebates;
      }

      console.error("Failed to validate saved debates:", result.error);

      // Attempt partial recovery: filter out invalid entries and keep valid ones
      if (Array.isArray(saved) && saved.length > 0) {
        const validDebates: SavedDebate[] = [];
        let invalidCount = 0;

        for (const item of saved) {
          const itemResult = savedDebateSchema.safeParse(item);
          if (itemResult.success) {
            validDebates.push(itemResult.data);
          } else {
            invalidCount++;
            console.warn("Skipping invalid debate entry:", item, itemResult.error);
          }
        }

        if (validDebates.length > 0) {
          // Sort by timestamp, most recent first
          validDebates.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Save the cleaned data back to storage
          try {
            setItem(STORAGE_KEYS.SAVED_DEBATES, validDebates);
          } catch (e) {
            console.error("Failed to save cleaned debates:", e);
          }

          console.warn(
            `Recovered ${validDebates.length} valid debate(s), removed ${invalidCount} invalid entry/entries`
          );
          return validDebates;
        }

        // No valid debates found, clear storage and set empty array
        console.error("No valid debates found in storage");
        try {
          setItem(STORAGE_KEYS.SAVED_DEBATES, []);
        } catch (e) {
          console.error("Failed to clear invalid debates:", e);
        }
        return [];
      }

      // Not an array or empty, return empty array
      return [];
    },
    [setItem]
  );

  /**
   * Load debates from localStorage
   */
  const loadDebates = useCallback(() => {
    setIsLoading(true);
    try {
      const saved = getItem<unknown>(STORAGE_KEYS.SAVED_DEBATES, []);
      const validatedDebates = validateAndSortDebates(saved);
      setDebates(validatedDebates);
    } finally {
      setIsLoading(false);
    }
  }, [getItem, validateAndSortDebates]);

  /**
   * Save a debate to localStorage.
   * Updates state and handles quota limits proactively.
   * @param debate - The debate object to save
   * @returns Object containing optional warning message if storage is filling up
   * @throws Error if storage quota is exceeded
   */
  const saveDebate = useCallback(
    (debate: SavedDebate): { warning: string | null } => {
      try {
        const existingDebates = getItem<SavedDebate[]>(STORAGE_KEYS.SAVED_DEBATES, []);
        const debates: SavedDebate[] = existingDebates || [];

        // Proactively check if we can fit this debate
        const { canWrite, warning } = checkQuotaBeforeWrite(debate);
        if (!canWrite) {
          throw new Error("Storage limit reached. Please delete some debates to free up space.");
        }

        const existingIndex = debates.findIndex((d) => d.debateId === debate.debateId);
        if (existingIndex >= 0) {
          debates[existingIndex] = debate;
        } else {
          debates.push(debate);
        }

        setItem(STORAGE_KEYS.SAVED_DEBATES, debates);

        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new Event("customStorageChange"));

        // Also trigger loadDebates directly for immediate update
        loadDebates();

        // Return warning if storage is getting full
        return { warning };
      } catch (e) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          console.error("Storage quota exceeded:", e);
          // Note: We can't use toast here as this is a hook, caller should handle UI feedback
          throw new Error("Storage limit reached. Please delete some debates to free up space.");
        }
        console.error("Error saving debate:", e);
        throw e;
      }
    },
    [getItem, setItem, loadDebates, checkQuotaBeforeWrite]
  );

  /**
   * Delete a debate from localStorage by ID.
   * Updates state immediately to reflect change.
   * @param debateId - The ID of the debate to delete
   */
  const deleteDebate = useCallback(
    (debateId: string) => {
      try {
        setDebates((prev) => {
          const updated = prev.filter((d) => d.debateId !== debateId);
          // Update storage first, then state to prevent inconsistency
          setItem(STORAGE_KEYS.SAVED_DEBATES, updated);
          return updated;
        });

        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new Event("customStorageChange"));
      } catch (e) {
        console.error("Error deleting debate:", e);
        // Reload from storage on error to restore consistency
        loadDebates();
        // Re-throw so caller can handle UI feedback
        throw e;
      }
    },
    [setItem, loadDebates]
  );

  useEffect(() => {
    loadDebates();

    const handleStorageChange = (e: StorageEvent) => {
      // Only reload if the saved_debates key changed
      if (e.key === STORAGE_KEYS.SAVED_DEBATES) {
        loadDebates();
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener("storage", handleStorageChange);

    // Also create a custom event listener for same-tab changes
    // This is needed because storage events only fire for changes from other tabs/windows
    const handleCustomStorageChange = () => {
      loadDebates();
    };

    // Listen for custom storage events (can be dispatched when saving debates in same tab)
    window.addEventListener("customStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("customStorageChange", handleCustomStorageChange);
    };
  }, [loadDebates]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDebates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDebates]);

  return { debates, isLoading, loadDebates, saveDebate, deleteDebate, getStorageStats };
}
