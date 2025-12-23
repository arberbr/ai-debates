import { useCallback } from "react";

/**
 * Custom hook for localStorage operations with error handling and type safety
 * Provides a consistent API for getting, setting, and removing items from localStorage
 */
export function useLocalStorage() {
  /**
   * Get an item from localStorage
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The stored value or default value
   */
  const getItem = useCallback(
    <T = string>(key: string, defaultValue: T | null = null): T | null => {
      try {
        const item = localStorage.getItem(key);
        if (item === null) {
          return defaultValue;
        }

        // Try to parse as JSON, fall back to string if it fails
        try {
          return JSON.parse(item) as T;
        } catch {
          // If parsing fails, return as string (for non-JSON values)
          return item as T;
        }
      } catch (e) {
        console.error(`Error reading from localStorage key "${key}":`, e);
        return defaultValue;
      }
    },
    []
  );

  /**
   * Set an item in localStorage
   * @param key - The storage key
   * @param value - The value to store (will be JSON stringified if not a string)
   * @throws Error if quota is exceeded or other storage errors occur
   */
  const setItem = useCallback(<T>(key: string, value: T): void => {
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.code === 22 || e.code === 1014 || e.name === "QuotaExceededError")
      ) {
        const error = new Error("Storage limit reached. Please free up space.");
        error.name = "QuotaExceededError";
        throw error;
      }
      console.error(`Error writing to localStorage key "${key}":`, e);
      throw e;
    }
  }, []);

  /**
   * Remove an item from localStorage
   * @param key - The storage key to remove
   */
  const removeItem = useCallback((key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing localStorage key "${key}":`, e);
    }
  }, []);

  /**
   * Clear all items from localStorage
   */
  const clear = useCallback((): void => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
  }, []);

  /**
   * Get a raw string value from localStorage (without JSON parsing)
   * Useful when you know the value is a string and don't want parsing
   */
  const getItemRaw = useCallback((key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`Error reading raw value from localStorage key "${key}":`, e);
      return null;
    }
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    getItemRaw,
  };
}
