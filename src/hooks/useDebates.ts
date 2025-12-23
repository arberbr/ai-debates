import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SavedDebate } from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

export function useDebates() {
  const [debates, setDebates] = useState<SavedDebate[]>([]);
  const { getItem, setItem } = useLocalStorage();

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

  const saveDebate = useCallback(
    (debate: SavedDebate) => {
      try {
        const existingDebates = getItem<SavedDebate[]>(STORAGE_KEYS.SAVED_DEBATES, []);
        const debates: SavedDebate[] = existingDebates || [];

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
    [getItem, setItem, loadDebates]
  );

  const deleteDebate = useCallback(
    (debateId: string) => {
      try {
        const updated = debates.filter((d) => d.debateId !== debateId);
        setDebates(updated);
        setItem(STORAGE_KEYS.SAVED_DEBATES, updated);

        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new Event("customStorageChange"));
      } catch (e) {
        console.error("Error deleting debate:", e);
        // Re-throw so caller can handle UI feedback
        throw e;
      }
    },
    [debates, setItem]
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

  return { debates, loadDebates, saveDebate, deleteDebate };
}
