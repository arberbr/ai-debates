import { useCallback, useEffect, useRef } from "react";
import { formatBytes } from "@/lib/utils";

/**
 * Custom hook for localStorage operations with error handling and type safety
 * Provides a consistent API for getting, setting, and removing items from localStorage
 */
export function useLocalStorage() {
  // Cache the quota estimate to avoid async calls in synchronous code paths
  const quotaCacheRef = useRef<number | null>(null);

  // Initialize quota cache asynchronously on mount
  useEffect(() => {
    const initQuota = async () => {
      try {
        if ("storage" in navigator && "estimate" in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && typeof estimate.quota === "number" && estimate.quota > 0) {
            quotaCacheRef.current = Math.min(estimate.quota, 50 * 1024 * 1024);
          }
        }
      } catch (e) {
        // Storage API not available, will use default
        console.debug("Failed to initialize quota cache:", e);
      }
    };
    initQuota();
  }, []);
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

  /**
   * Get storage usage statistics (synchronous version using cached quota)
   * @returns Object with current usage in bytes, estimated quota, and usage percentage
   */
  const getStorageStats = useCallback((): {
    usedBytes: number;
    estimatedQuotaBytes: number;
    usagePercent: number;
    formattedUsed: string;
    formattedQuota: string;
  } => {
    try {
      let usedBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          // Calculate size: key + value in UTF-16 (2 bytes per character)
          usedBytes += (key.length + (value?.length || 0)) * 2;
        }
      }

      // Use cached quota estimate, or fallback to conservative default
      const estimatedQuotaBytes = quotaCacheRef.current ?? 5 * 1024 * 1024;
      const usagePercent = Math.round((usedBytes / estimatedQuotaBytes) * 100);

      return {
        usedBytes,
        estimatedQuotaBytes,
        usagePercent,
        formattedUsed: formatBytes(usedBytes),
        formattedQuota: formatBytes(estimatedQuotaBytes),
      };
    } catch (e) {
      console.error("Error calculating storage stats:", e);
      const defaultQuota = 5 * 1024 * 1024;
      return {
        usedBytes: 0,
        estimatedQuotaBytes: defaultQuota,
        usagePercent: 0,
        formattedUsed: "0 B",
        formattedQuota: "5 MB",
      };
    }
  }, []);

  /**
   * Check if storage can accommodate new data before writing
   * @param dataSize - Size of data to write in bytes (or provide value to calculate)
   * @param value - Alternative: provide value to calculate size automatically
   * @returns Object with canWrite boolean and warning if approaching limit
   */
  const checkQuotaBeforeWrite = useCallback(
    <T>(
      value: T
    ): {
      canWrite: boolean;
      warning: string | null;
      estimatedNewUsage: number;
    } => {
      const stats = getStorageStats();
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      const dataSize = serialized.length * 2; // UTF-16 encoding
      const newTotal = stats.usedBytes + dataSize;
      const newUsagePercent = Math.round((newTotal / stats.estimatedQuotaBytes) * 100);

      let warning: string | null = null;
      if (newUsagePercent >= 90) {
        warning = "Storage is almost full. Consider deleting old debates to free up space.";
      } else if (newUsagePercent >= 75) {
        warning = "Storage is getting full. You may want to delete some old debates.";
      }

      return {
        canWrite: newTotal < stats.estimatedQuotaBytes,
        warning,
        estimatedNewUsage: newUsagePercent,
      };
    },
    [getStorageStats]
  );

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    getItemRaw,
    getStorageStats,
    checkQuotaBeforeWrite,
  };
}
