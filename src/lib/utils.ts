import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEBATE_CONFIG, MODEL_OPTIONS } from "./constants";

/**
 * Utility function to merge class names using clsx and tailwind-merge.
 * Combines conditional classes and resolves Tailwind CSS class conflicts.
 * @param inputs - Variable number of class name arguments (strings, objects, arrays)
 * @returns Merged class name string optimized for Tailwind CSS
 * @example
 * cn("px-2", { "text-red": isRed }, ["py-1", "bg-blue"])
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a debounced version of a function that delays execution until after
 * the specified time has elapsed since the last invocation.
 * @param fn - The function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 * debouncedSearch("test"); // Will execute after 300ms of no calls
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Strips markdown syntax from text content to get plain text
 * @param content - Text content with markdown
 * @returns Plain text with markdown syntax removed
 */
export function stripMarkdown(content: string): string {
  return (
    content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      // Remove links but keep the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove markdown formatting
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove list markers
      .replace(/^[*\-+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^---+$/gm, "")
      // Clean up extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Calculates estimated reading time for text content
 * @param content - Text content (can include markdown)
 * @param wordsPerMinute - Average reading speed (default: DEBATE_CONFIG.WORDS_PER_MINUTE)
 * @returns Formatted reading time string (e.g., "5 min read", "1 min read")
 */
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = DEBATE_CONFIG.WORDS_PER_MINUTE
): string {
  if (!content || content.trim().length === 0) {
    return "0 min read";
  }

  // Strip markdown syntax to get plain text
  const plainText = stripMarkdown(content);

  // Count words (split by whitespace and filter empty strings)
  const words = plainText.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  // Calculate reading time in minutes
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

  return `${minutes} min read`;
}

/**
 * Formats a date in 24-hour format
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "12/21/2025 21:01:07")
 */
export function formatDate24Hour(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getSeconds()).padStart(2, "0");

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Gets the display name for a model by its slug
 * @param slug - Model slug (e.g., "anthropic/claude-sonnet-4.5")
 * @returns Display name if found, otherwise returns the slug
 */
export function getModelName(slug: string): string {
  const model = MODEL_OPTIONS.find((m) => m.slug === slug);
  return model ? model.name : slug;
}

/**
 * Calculates total reading time for a debate side (FOR/AGAINST)
 * @param debate - Debate object with openingStatements, debateRounds, and conclusions
 * @param side - 'yes' for FOR side, 'no' for AGAINST side
 * @returns Total reading time as formatted string (e.g., "5 min read")
 */
export function calculateTotalReadingTimeForSide(
  debate: {
    openingStatements?: { yesStatement?: { content: string }; noStatement?: { content: string } };
    debateRounds?: Array<{ yesMessage?: { content: string }; noMessage?: { content: string } }>;
    conclusions?: { yesConclusion?: { content: string }; noConclusion?: { content: string } };
  },
  side: "yes" | "no"
): string {
  let totalWords = 0;
  const wordsPerMinute = DEBATE_CONFIG.WORDS_PER_MINUTE;

  // Helper to count words in content
  const countWords = (content: string | undefined): number => {
    if (!content || content.trim().length === 0) return 0;

    // Strip markdown syntax using shared utility
    const plainText = stripMarkdown(content);

    return plainText.split(/\s+/).filter((word) => word.length > 0).length;
  };

  // Opening statement
  if (side === "yes" && debate.openingStatements?.yesStatement?.content) {
    totalWords += countWords(debate.openingStatements.yesStatement.content);
  } else if (side === "no" && debate.openingStatements?.noStatement?.content) {
    totalWords += countWords(debate.openingStatements.noStatement.content);
  }

  // Debate rounds
  if (debate.debateRounds) {
    for (const round of debate.debateRounds) {
      if (side === "yes" && round.yesMessage?.content) {
        totalWords += countWords(round.yesMessage.content);
      } else if (side === "no" && round.noMessage?.content) {
        totalWords += countWords(round.noMessage.content);
      }
    }
  }

  // Conclusion
  if (side === "yes" && debate.conclusions?.yesConclusion?.content) {
    totalWords += countWords(debate.conclusions.yesConclusion.content);
  } else if (side === "no" && debate.conclusions?.noConclusion?.content) {
    totalWords += countWords(debate.conclusions.noConclusion.content);
  }

  // Calculate minutes (minimum 1 minute)
  const minutes = Math.max(1, Math.ceil(totalWords / wordsPerMinute));
  return `${minutes} min read`;
}

/**
 * Formats a number of bytes into a human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1024 B", "1 KB", "1 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Generates a UUID v4 with fallback for non-HTTPS environments
 * Uses crypto.randomUUID() when available (requires HTTPS in production),
 * otherwise falls back to a random UUID generation
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  // Try to use crypto.randomUUID() if available (requires HTTPS in production)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback implementation
    }
  }

  // Fallback UUID v4 generation for non-HTTPS environments
  // This generates a valid UUID v4 using Math.random()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets the current timestamp as an ISO string
 * @returns Current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Gets a formatted debate title with fallback
 * @param topic - Debate topic string (may be undefined or empty)
 * @param fallback - Fallback title if topic is empty (default: "Untitled Debate")
 * @returns Formatted debate title
 */
export function getDebateTitle(topic?: string | null, fallback = "Untitled Debate"): string {
  return topic?.trim() || fallback;
}

/**
 * Model statistics for leaderboard
 */
export interface ModelStats {
  model: string;
  modelName: string;
  wins: number;
  losses: number;
  ties: number;
  totalDebates: number;
  winRate: number;
  averageScore: number;
  totalTokens: number;
  totalCost: number;
  averageCost: number;
}

/**
 * Total statistics for leaderboard
 */
export interface TotalStats {
  totalDebates: number;
  totalCost: number;
  totalTokens: number;
  averageRounds: number;
}

/**
 * Leaderboard statistics result
 */
export interface LeaderboardStats {
  modelStatsArray: ModelStats[];
  totalStats: TotalStats;
}

/**
 * Calculates model statistics and total statistics from debates.
 * Extracted from leaderboard component for better testability and reusability.
 *
 * @param debates - Array of saved debates to analyze
 * @param getModelNameFn - Function to get display name for a model slug
 * @param _cleanStringFn - Function to clean/format topic strings (unused, kept for API compatibility)
 * @returns Object containing model stats array and total stats
 */
export function calculateModelStats(
  debates: Array<{
    finalResult?: {
      winner?: "yes" | "no" | "tie";
      aggregateScore?: { yes?: number; no?: number };
    } | null;
    yesModel?: string;
    noModel?: string;
    topic?: string;
    rounds?: string;
    usage?: { total_tokens?: number; cost?: number };
  }>,
  getModelNameFn: (slug: string) => string,
  _cleanStringFn: (str: string) => string
): LeaderboardStats {
  const modelMap = new Map<string, ModelStats>();

  /**
   * Creates initial stats for a model
   */
  const createInitialStats = (modelSlug: string): ModelStats => ({
    model: modelSlug,
    modelName: getModelNameFn(modelSlug),
    wins: 0,
    losses: 0,
    ties: 0,
    totalDebates: 0,
    winRate: 0,
    averageScore: 0,
    totalTokens: 0,
    totalCost: 0,
    averageCost: 0,
  });

  /**
   * Gets or creates stats for a model
   */
  const getOrCreateStats = (modelSlug: string): ModelStats => {
    const existing = modelMap.get(modelSlug);
    if (existing) {
      return existing;
    }
    const newStats = createInitialStats(modelSlug);
    modelMap.set(modelSlug, newStats);
    return newStats;
  };

  /**
   * Updates stats for a model based on debate result
   */
  const updateModelStats = (
    stats: ModelStats,
    side: "yes" | "no",
    winner: "yes" | "no" | "tie" | undefined,
    score: number | undefined,
    usage: { total_tokens?: number; cost?: number } | undefined
  ): void => {
    stats.totalDebates++;

    if (winner === side) {
      stats.wins++;
    } else if (winner && winner !== "tie") {
      stats.losses++;
    } else if (winner === "tie") {
      stats.ties++;
    }

    if (score !== undefined) {
      stats.averageScore =
        (stats.averageScore * (stats.totalDebates - 1) + score) / stats.totalDebates;
    }

    if (usage?.total_tokens) {
      stats.totalTokens += usage.total_tokens;
    }

    if (usage?.cost) {
      stats.totalCost += usage.cost;
    }
  };

  // Process each debate
  for (const debate of debates) {
    if (!debate.finalResult || !debate.yesModel || !debate.noModel) continue;

    const { yesModel, noModel, finalResult, usage } = debate;
    const { winner, aggregateScore } = finalResult;

    const yesStats = getOrCreateStats(yesModel);
    const noStats = getOrCreateStats(noModel);

    updateModelStats(yesStats, "yes", winner, aggregateScore?.yes, usage);
    updateModelStats(noStats, "no", winner, aggregateScore?.no, usage);
  }

  // Calculate win rates and average costs
  const statsArray = Array.from(modelMap.values()).map((stats) => {
    const winRate =
      stats.totalDebates > 0 ? ((stats.wins + stats.ties * 0.5) / stats.totalDebates) * 100 : 0;
    const averageCost = stats.totalDebates > 0 ? stats.totalCost / stats.totalDebates : 0;
    return {
      ...stats,
      winRate: Math.round(winRate * 100) / 100,
      averageScore: Math.round(stats.averageScore * 100) / 100,
      averageCost: Math.round(averageCost * 10000) / 10000,
    };
  });

  // Calculate total statistics
  const totalCost = debates.reduce((sum, d) => sum + (d.usage?.cost || 0), 0);
  const totalTokens = debates.reduce((sum, d) => sum + (d.usage?.total_tokens || 0), 0);
  const totalRounds = debates.reduce((sum, d) => sum + (parseInt(d.rounds || "0", 10) || 0), 0);
  const avgRounds = debates.length > 0 ? totalRounds / debates.length : 0;

  return {
    modelStatsArray: statsArray,
    totalStats: {
      totalDebates: debates.length,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      averageRounds: Math.round(avgRounds * 100) / 100,
    },
  };
}
