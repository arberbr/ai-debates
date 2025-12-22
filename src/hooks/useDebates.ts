import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SavedDebate } from "@/lib/types";

export function useDebates() {
  const [debates, setDebates] = useState<SavedDebate[]>([]);

  const loadDebates = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_DEBATES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedDebate[];
        // Sort by timestamp, most recent first
        parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDebates(parsed);
      } catch (e) {
        console.error("Error loading saved debates:", e);
        setDebates([]);
      }
    } else {
      setDebates([]);
    }
  }, []);

  const saveDebate = useCallback(
    (debate: SavedDebate) => {
      const existingDebates = localStorage.getItem(STORAGE_KEYS.SAVED_DEBATES);
      const debates: SavedDebate[] = existingDebates ? JSON.parse(existingDebates) : [];

      const existingIndex = debates.findIndex((d) => d.debateId === debate.debateId);
      if (existingIndex >= 0) {
        debates[existingIndex] = debate;
      } else {
        debates.push(debate);
      }

      localStorage.setItem(STORAGE_KEYS.SAVED_DEBATES, JSON.stringify(debates));

      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(new Event("customStorageChange"));

      // Also trigger loadDebates directly for immediate update
      loadDebates();
    },
    [loadDebates]
  );

  const deleteDebate = useCallback(
    (debateId: string) => {
      const updated = debates.filter((d) => d.debateId !== debateId);
      setDebates(updated);
      localStorage.setItem(STORAGE_KEYS.SAVED_DEBATES, JSON.stringify(updated));

      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(new Event("customStorageChange"));
    },
    [debates]
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
