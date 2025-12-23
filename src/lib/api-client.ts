import { DEBATE_CONFIG, getApiBaseUrl, TIMING } from "./constants";

/**
 * API response types
 */
export interface TitleGenerationResponse {
  title: string;
}

export interface DebateStartConfig {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: number;
  judgePrompt: string;
  title: string;
  api_key: string;
}

/**
 * API error class for better error handling
 */
export class ApiError extends Error {
  status: number;
  isAuthError: boolean;

  constructor(message: string, status: number, isAuthError = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isAuthError = isAuthError;
  }
}

/**
 * Centralized API client for making requests to the backend
 * Provides consistent error handling, retry logic, and type-safe API methods
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  /**
   * Make a request with automatic retry and error handling
   * @param endpoint - API endpoint path
   * @param options - Fetch options
   * @param retries - Number of retry attempts
   * @returns Response object
   */
  async request(
    endpoint: string,
    options: RequestInit,
    retries = TIMING.MAX_RETRY_ATTEMPTS
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.ok || attempt === retries - 1) {
          return response;
        }

        // Only retry on network errors or 5xx errors
        if (response.status >= 500 || response.status === 0) {
          const delay = TIMING.RETRY_BASE_DELAY * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === retries - 1) throw error;
        const delay = TIMING.RETRY_BASE_DELAY * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Parse error response and create ApiError
   */
  async parseError(response: Response): Promise<ApiError> {
    let errorText = "";
    try {
      errorText = await response.text();
    } catch {
      errorText = "Unknown error";
    }

    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      errorText.includes("API key") ||
      errorText.includes("OpenRouter") ||
      errorText.includes("authentication") ||
      errorText.includes("unauthorized");

    let message = `HTTP error! status: ${response.status}`;

    if (isAuthError) {
      message = "Authentication error: Invalid or missing API key. Please check your API key.";
    } else if (errorText) {
      message = `${message}: ${errorText.substring(0, DEBATE_CONFIG.ERROR_MESSAGE_MAX_LENGTH)}`;
    }

    return new ApiError(message, response.status, isAuthError);
  }

  /**
   * Generate a debate title
   * @param topic - The debate topic
   * @param apiKey - OpenRouter API key
   * @param signal - Optional abort signal
   * @returns Generated title or null if generation fails
   */
  async generateTitle(topic: string, apiKey: string, signal?: AbortSignal): Promise<string | null> {
    try {
      const response = await this.request("/api/debate/generate-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          api_key: apiKey,
        }),
        signal,
      });

      if (!response.ok) {
        console.warn("Title generation failed with status:", response.status);
        return null;
      }

      try {
        const data = (await response.json()) as TitleGenerationResponse;
        if (data?.title && typeof data.title === "string") {
          return data.title;
        }
        console.warn("Title generation response missing title field", data);
        return null;
      } catch (jsonError) {
        console.warn("Failed to parse title response JSON:", jsonError);
        return null;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      console.warn("Title generation error:", error);
      return null;
    }
  }

  /**
   * Start a debate stream (SSE)
   * @param config - Debate configuration
   * @param signal - Optional abort signal
   * @returns Response with readable stream body
   * @throws ApiError if request fails
   */
  async startDebateStream(config: DebateStartConfig, signal?: AbortSignal): Promise<Response> {
    const response = await this.request("/api/debate/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
      signal,
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response;
  }
}

/**
 * Default API client instance
 * Use this for most API calls, or create a new instance for custom base URLs
 */
export const apiClient = new ApiClient();

/**
 * Helper to create debate start config from debate parameters
 */
export function createDebateStartConfig(params: {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: string;
  judgePrompt: string;
  title: string;
  apiKey: string;
}): DebateStartConfig {
  return {
    topic: params.topic,
    yesModel: params.yesModel,
    noModel: params.noModel,
    rounds: parseInt(params.rounds || "3", 10),
    judgePrompt: params.judgePrompt || "",
    title: params.title,
    api_key: params.apiKey,
  };
}
