/**
 * Error handling utilities for consistent error message extraction and formatting
 */

/**
 * Extracts a user-friendly error message from various error types
 * @param error - Error instance, string, or unknown type
 * @param fallback - Fallback message if error cannot be extracted
 * @returns User-friendly error message
 */
export function extractErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

/**
 * Checks if an error is related to authentication/authorization
 * @param error - Error instance or error message
 * @returns True if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error, "").toLowerCase();
  return (
    errorMessage.includes("openrouter") ||
    errorMessage.includes("api key") ||
    errorMessage.includes("401") ||
    errorMessage.includes("403") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized")
  );
}

/**
 * Checks if an error is related to credit/payment limits
 * @param error - Error instance or error message
 * @returns True if error is a credit limit error
 */
export function isCreditLimitError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error, "").toLowerCase();
  return errorMessage.includes("credits") || errorMessage.includes("402");
}

/**
 * Checks if an error is related to storage quota
 * @param error - Error instance or error message
 * @returns True if error is a storage quota error
 */
export function isStorageQuotaError(error: unknown): boolean {
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return true;
  }

  const errorMessage = extractErrorMessage(error, "").toLowerCase();
  return (
    errorMessage.includes("quota") ||
    errorMessage.includes("storage") ||
    errorMessage.includes("limit reached")
  );
}

/**
 * Formats an error for display to the user
 * @param error - Error instance or error message
 * @param context - Optional context about where the error occurred
 * @returns Formatted error message
 */
export function formatErrorForDisplay(error: unknown, context?: string): string {
  const message = extractErrorMessage(error);
  return context ? `${context}: ${message}` : message;
}
