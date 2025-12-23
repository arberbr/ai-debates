import { toast } from "sonner";

/**
 * Centralized error handler utility for consistent error handling across the application.
 *
 * @param error - The error object to handle
 * @param context - A string describing where the error occurred (for logging)
 * @param showToast - Whether to show a toast notification to the user (default: true)
 * @returns The error message string
 */
export function handleError(error: unknown, context: string, showToast = true): string {
  const message = error instanceof Error ? error.message : "An error occurred";
  console.error(`[${context}]`, error);

  if (showToast) {
    toast.error(message);
  }

  return message;
}

/**
 * Handle quota exceeded errors specifically
 */
export function handleQuotaError(error: unknown, showToast = true): boolean {
  if (error instanceof Error && error.name === "QuotaExceededError") {
    const message = "Storage limit reached. Please delete some debates to free up space.";
    console.error("[Storage Quota]", error);
    if (showToast) {
      toast.error(message);
    }
    return true;
  }
  return false;
}
