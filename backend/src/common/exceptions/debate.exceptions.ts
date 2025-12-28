/**
 * Custom exception classes for debate-related errors.
 * Provides structured error handling with appropriate HTTP status codes.
 */

export class DebateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when API key is missing or invalid.
 */
export class ApiKeyError extends DebateError {
  constructor(message: string = 'OpenRouter API key is required') {
    super(message, 'INVALID_API_KEY', 401);
  }
}

/**
 * Error thrown when a model fails to respond or returns an error.
 */
export class ModelError extends DebateError {
  constructor(
    message: string,
    public readonly model: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'MODEL_ERROR', 502, { model });
  }
}

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends DebateError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out: ${operation} (exceeded ${timeoutMs}ms)`,
      'TIMEOUT',
      504,
      { operation, timeoutMs },
    );
  }
}

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends DebateError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
  }
}

/**
 * Error thrown when a debate resource is not found.
 */
export class DebateNotFoundError extends DebateError {
  constructor(debateId: string) {
    super(`Debate not found: ${debateId}`, 'DEBATE_NOT_FOUND', 404, {
      debateId,
    });
  }
}

/**
 * Error thrown when OpenRouter API returns an error.
 */
export class OpenRouterApiError extends DebateError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
  ) {
    super(message, 'OPENROUTER_API_ERROR', statusCode >= 500 ? 502 : 400, {
      statusCode,
      responseBody: responseBody?.substring(0, 200),
    });
  }
}
