/**
 * Keyed Asynchronous Lock Manager
 * Prevents race conditions and duplicate active allocations
 * by serializing simultaneous requests for the same lab or resource.
 */

export class LockManager {
  private locks: Map<string, Promise<void>> = new Map();

  /**
   * Acquires a lock for the given key and executes the task exclusively.
   * Subsequent callers for the same key await the previous caller's completion.
   */
  public async withLock<T>(key: string, task: () => Promise<T> | T): Promise<T> {
    const previousLock = this.locks.get(key) || Promise.resolve();

    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Chain the current lock after the previous one completes
    const chained = previousLock
      .catch(() => {}) // don't let previous failures block future callers
      .then(() => currentLock);

    this.locks.set(key, chained);

    try {
      await previousLock;
      return await task();
    } finally {
      releaseLock!();
      if (this.locks.get(key) === chained) {
        this.locks.delete(key);
      }
    }
  }
}

export const bookingLockManager = new LockManager();
