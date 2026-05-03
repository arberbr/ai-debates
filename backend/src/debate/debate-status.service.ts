import { Injectable, Logger } from '@nestjs/common';
import { DebateStatus } from './interfaces/debate.interface';

@Injectable()
export class DebateStatusService {
  private readonly logger = new Logger(DebateStatusService.name);
  private statuses: Map<string, DebateStatus> = new Map();
  private readonly MAX_STATUS_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Set status for a debate ID
   */
  setStatus(debateId: string, status: DebateStatus): void {
    this.statuses.set(debateId, status);
    // Cleanup old entries periodically
    this.cleanupOldStatuses();
  }

  /**
   * Get status for a debate ID
   */
  getStatus(debateId: string): DebateStatus | null {
    const status = this.statuses.get(debateId);
    if (status) {
      // Check if status is too old
      const age = Date.now() - new Date(status.timestamp).getTime();
      if (age > this.MAX_STATUS_AGE) {
        this.statuses.delete(debateId);
        return null;
      }
    }
    return status || null;
  }

  /**
   * Check if a debate ID exists
   */
  hasStatus(debateId: string): boolean {
    return this.statuses.has(debateId) && this.getStatus(debateId) !== null;
  }

  /**
   * Delete status for a debate ID (cleanup)
   */
  deleteStatus(debateId: string): void {
    this.statuses.delete(debateId);
  }

  /**
   * Cleanup old status entries to prevent memory leaks
   */
  private cleanupOldStatuses(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, status] of this.statuses.entries()) {
      const age = now - new Date(status.timestamp).getTime();
      if (age > this.MAX_STATUS_AGE) {
        this.statuses.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old status entries`);
    }
  }

  /**
   * Get count of active statuses (for monitoring)
   */
  getStatusCount(): number {
    this.cleanupOldStatuses();
    return this.statuses.size;
  }
}
