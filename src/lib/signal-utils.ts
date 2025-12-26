/**
 * Utility functions for working with AbortSignal
 */

/**
 * Combines multiple AbortSignals into a single signal.
 * The combined signal will abort when any of the input signals abort.
 * @param signals - Array of AbortSignals to combine (undefined or null values are ignored)
 * @returns A new AbortSignal that aborts when any input signal aborts
 * @example
 * const signal1 = new AbortController().signal;
 * const signal2 = new AbortController().signal;
 * const combined = combineAbortSignals(signal1, signal2);
 * // combined will abort when either signal1 or signal2 aborts
 */
export function combineAbortSignals(...signals: (AbortSignal | null | undefined)[]): AbortSignal {
  const controller = new AbortController();

  signals.forEach((signal) => {
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }
  });

  return controller.signal;
}
