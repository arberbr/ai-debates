/**
 * Custom decorator to extract API key from Authorization header.
 * Reduces code duplication across controller methods.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEBATE_CONSTANTS } from '../constants/debate.constants';

/**
 * Extracts the API key from the Authorization header.
 * Returns null if no valid Bearer token is found.
 *
 * @example
 * ```typescript
 * async startDebate(
 *   @Body() dto: StartDebateDto,
 *   @ExtractApiKey() apiKey: string | null,
 * ) { ... }
 * ```
 */
export const ExtractApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers[DEBATE_CONSTANTS.AUTH.HEADER_NAME];

    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const match = authHeader.match(
      new RegExp(`^${DEBATE_CONSTANTS.AUTH.BEARER_PREFIX}\\s+(.+)$`, 'i'),
    );

    return match?.[1]?.trim() || null;
  },
);
