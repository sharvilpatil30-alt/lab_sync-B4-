/**
 * In-Memory Lease & Lock Manager (Simulation & Fast Liveness Guard)
 *
 * ARCHITECTURAL NOTICE:
 * This lock manager provides short-lived in-memory lease reservations (e.g. 15-minute locks)
 * to prevent immediate duplicate submissions within a single node.
 * It is NOT authoritative for multi-process concurrency safety.
 *
 * Authoritative ACID protection is strictly enforced by PostgreSQL row locks (SELECT ... FOR UPDATE)
 * and the btree_gist exclusion constraint defined in database/migrations/001_core.sql.
 */

export interface LeaseRecord {
  leaseId: string;
  resourceId: string;
  userId: string;
  acquiredAt: number;
  expiresAt: number;
}

export class LockManager {
  private leases: Map<string, LeaseRecord> = new Map();

  /**
   * Attempt to acquire an in-memory lease lock for a resource.
   */
  public acquireLease(
    resourceId: string,
    userId: string,
    ttlMs: number = 15 * 60 * 1000
  ): { acquired: boolean; lease?: LeaseRecord; reason?: string } {
    this.cleanExpired();

    const existing = this.leases.get(resourceId);
    if (existing) {
      if (existing.userId === userId) {
        // Idempotent re-acquisition by same user
        return { acquired: true, lease: existing };
      }
      return {
        acquired: false,
        reason: `Resource ${resourceId} is leased by user ${existing.userId} until ${new Date(existing.expiresAt).toISOString()}`,
      };
    }

    const now = Date.now();
    const lease: LeaseRecord = {
      leaseId: `lease-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      resourceId,
      userId,
      acquiredAt: now,
      expiresAt: now + ttlMs,
    };

    this.leases.set(resourceId, lease);
    return { acquired: true, lease };
  }

  /**
   * Explicitly release an active lease.
   */
  public releaseLease(resourceId: string, leaseId?: string): boolean {
    const existing = this.leases.get(resourceId);
    if (!existing) return false;
    if (leaseId && existing.leaseId !== leaseId) return false;

    this.leases.delete(resourceId);
    return true;
  }

  /**
   * Check if a resource has an active lease.
   */
  public isLeased(resourceId: string): boolean {
    this.cleanExpired();
    return this.leases.has(resourceId);
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [resId, lease] of this.leases.entries()) {
      if (lease.expiresAt <= now) {
        this.leases.delete(resId);
      }
    }
  }

  public clear(): void {
    this.leases.clear();
  }
}

export const lockManager = new LockManager();

