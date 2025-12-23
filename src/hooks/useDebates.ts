import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SavedDebate } from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Custom hook for managing saved debates in localStorage.
 * Handles loading, saving, deletion, and cross-tab synchronization.
 * @returns Object containing debates list and management functions
 */
export function useDebates() {
  const [debates, setDebates] = useState<SavedDebate[]>([]);
  const { getItem, setItem, checkQuotaBeforeWrite, getStorageStats } = useLocalStorage();

  /**
   * Load debates from localStorage
   */
  const loadDebates = useCallback(() => {
    const saved = getItem<SavedDebate[]>(STORAGE_KEYS.SAVED_DEBATES, []);
    if (saved && Array.isArray(saved)) {
      // Sort by timestamp, most recent first
      saved.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDebates(saved);
    } else {
      setDebates([]);
    }
  }, [getItem]);

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
        const updated = debates.filter((d) => d.debateId !== debateId);
        // Update storage first, then state to prevent inconsistency
        setItem(STORAGE_KEYS.SAVED_DEBATES, updated);
        setDebates(updated);

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
    [debates, setItem, loadDebates]
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

  return { debates, loadDebates, saveDebate, deleteDebate, getStorageStats };
}
