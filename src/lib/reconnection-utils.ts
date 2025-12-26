import { TIMING } from "./constants";

/**
 * Configuration for reconnection attempts
 */
export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  getCurrentAttempt: () => number;
  incrementAttempt: () => void;
  resetAttempts: () => void;
}

/**
 * Creates a reconnection configuration with default values
 */
export function createReconnectionConfig(): ReconnectionConfig {
  let currentAttempt = 0;

  return {
    maxAttempts: TIMING.SSE_MAX_RECONNECT_ATTEMPTS,
    baseDelay: TIMING.SSE_RECONNECT_BASE_DELAY,
    getCurrentAttempt: () => currentAttempt,
    incrementAttempt: () => {
      currentAttempt++;
    },
    resetAttempts: () => {
      currentAttempt = 0;
    },
  };
}

/**
 * Calculates the delay for a reconnection attempt using exponential backoff
 * @param attemptNumber - Current attempt number (1-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateReconnectDelay(attemptNumber: number, baseDelay: number): number {
  return baseDelay * attemptNumber;
}

/**
 * Checks if reconnection should be attempted
 * @param config - Reconnection configuration
 * @returns True if reconnection should be attempted
 */
export function shouldAttemptReconnect(config: ReconnectionConfig): boolean {
  return config.getCurrentAttempt() < config.maxAttempts;
}

/**
 * Gets a user-friendly reconnection status message
 * @param attemptNumber - Current attempt number
 * @param maxAttempts - Maximum number of attempts
 * @returns Status message string
 */
export function getReconnectionStatusMessage(attemptNumber: number, maxAttempts: number): string {
  return `Reconnecting... (attempt ${attemptNumber}/${maxAttempts})`;
}
