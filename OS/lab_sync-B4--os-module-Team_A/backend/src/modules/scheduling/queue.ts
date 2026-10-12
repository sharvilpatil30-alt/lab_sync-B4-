import {
  BookingRequest,
  SchedulingDecision,
  SchedulingContext,
} from './types.js';
import { evaluateBookingRequest, compareRequestsFCFS } from './fcfs.js';
import { schedulingMetrics } from './metrics.js';

export interface QueuedItem {
  id: string;
  request: BookingRequest;
  context?: SchedulingContext;
  enqueuedAt: number;
  resolve: (decision: SchedulingDecision) => void;
  reject: (err: any) => void;
}

/**
 * In-memory deterministic FCFS Request Queue.
 * 
 * ARCHITECTURAL NOTICE:
 * This queue manages serial sequencing within a single Node.js runtime process.
 * It tracks true queue wait times and ensures deterministic first-come, first-served
 * ordering among concurrent local requests.
 * 
 * It does NOT replace database concurrency control. Cross-process isolation and
 * persistent atomicity are strictly guaranteed by PostgreSQL transactions
 * and the GiST exclusion constraint (001_core.sql) owned by Team C.
 */
export class FCFSSchedulingQueue {
  private queue: QueuedItem[] = [];
  private processing = false;

  public getQueueDepth(): number {
    return this.queue.length;
  }

  /**
   * Enqueue a booking request for deterministic serialized evaluation.
   */
  public enqueue(
    request: BookingRequest,
    context?: SchedulingContext
  ): Promise<SchedulingDecision> {
    return new Promise<SchedulingDecision>((resolve, reject) => {
      const enqueuedAt = performance.now();
      const id = request.requestId || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      schedulingMetrics.recordStartQueue();

      this.queue.push({
        id,
        request,
        context,
        enqueuedAt,
        resolve,
        reject,
      });

      // Sort queue deterministically if multiple items arrive in same tick
      this.sortQueue();

      this.processNext();
    });
  }

  private sortQueue(): void {
    this.queue.sort((a, b) =>
      compareRequestsFCFS(
        { ...a.request, arrivalTimeMs: a.enqueuedAt, requestId: a.id },
        { ...b.request, arrivalTimeMs: b.enqueuedAt, requestId: b.id }
      )
    );
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const item = this.queue.shift();

    if (!item) {
      this.processing = false;
      return;
    }

    schedulingMetrics.recordDequeued();

    const waitTimeMs = Math.max(0, performance.now() - item.enqueuedAt);

    try {
      const decision = await evaluateBookingRequest(item.request, item.context);

      // Attach measured queue wait time to details if accepted
      if (decision.details) {
        decision.details.waitTimeMs = Math.round(waitTimeMs);
      }

      item.resolve(decision);
    } catch (err) {
      item.reject(err);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  public clear(): void {
    this.queue = [];
    this.processing = false;
  }
}

export const schedulingQueue = new FCFSSchedulingQueue();

