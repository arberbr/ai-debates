import { Injectable } from '@nestjs/common';
import { DebateStatus } from './interfaces/debate.interface';

@Injectable()
export class DebateStatusService {
  private statuses: Map<string, DebateStatus> = new Map();

  /**
   * Set status for a debate ID
   */
  setStatus(debateId: string, status: DebateStatus): void {
    this.statuses.set(debateId, status);
  }

  /**
   * Get status for a debate ID
   */
  getStatus(debateId: string): DebateStatus | null {
    return this.statuses.get(debateId) || null;
  }

  /**
   * Check if a debate ID exists
   */
  hasStatus(debateId: string): boolean {
    return this.statuses.has(debateId);
  }

  /**
   * Delete status for a debate ID (cleanup)
   */
  deleteStatus(debateId: string): void {
    this.statuses.delete(debateId);
  }
}
