import { useRef } from "react";

interface UseRateLimitOptions {
  /** Minimum time between submissions in milliseconds */
  limitMs: number;
  /** Callback when rate limit is exceeded */
  onRateLimitExceeded?: (waitTimeSeconds: number) => void;
}

/**
 * Custom hook for rate limiting form submissions
 * @param options - Rate limit configuration
 * @returns Object with checkRateLimit function
 */
export function useRateLimit({ limitMs, onRateLimitExceeded }: UseRateLimitOptions) {
  const lastSubmissionRef = useRef<number>(0);

  /**
   * Checks if the current submission violates rate limit
   * @returns True if submission is allowed, false if rate limited
   */
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionRef.current;

    if (timeSinceLastSubmission < limitMs) {
      const waitTimeSeconds = Math.ceil((limitMs - timeSinceLastSubmission) / 1000);
      onRateLimitExceeded?.(waitTimeSeconds);
      return false;
    }

    lastSubmissionRef.current = now;
    return true;
  };

  return { checkRateLimit };
}
