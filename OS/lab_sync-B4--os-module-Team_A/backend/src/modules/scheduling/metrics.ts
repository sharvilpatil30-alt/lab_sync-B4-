import { SchedulingMetrics, DecisionType } from './types.js';

/**
 * Metric Tracker for Team A Scheduling Service
 * Scope: In-memory process metrics since server launch or last explicit reset.
 * Distinguishes queue wait time from actual evaluation processing latency.
 */
export class MetricsTracker {
  private processedRequests = 0;
  private acceptedRequests = 0;
  private rejectedRequests = 0;
  private totalWaitMs = 0;
  private totalProcessingLatencyMs = 0;
  private activeQueueDepth = 0;
  private lastResetAt: string;

  constructor() {
    this.lastResetAt = new Date().toISOString();
  }

  public recordStartQueue(): void {
    this.activeQueueDepth++;
  }

  public recordDequeued(): void {
    if (this.activeQueueDepth > 0) {
      this.activeQueueDepth--;
    }
  }

  public recordRequest(params: {
    decision: DecisionType;
    waitTimeMs: number;
    processingLatencyMs: number;
  }): void {
    this.processedRequests++;
    if (params.decision === 'ACCEPT') {
      this.acceptedRequests++;
    } else {
      this.rejectedRequests++;
    }

    this.totalWaitMs += Math.max(0, params.waitTimeMs);
    this.totalProcessingLatencyMs += Math.max(0, params.processingLatencyMs);
  }

  public getMetrics(): SchedulingMetrics {
    const avgWait =
      this.processedRequests > 0
        ? Math.round(this.totalWaitMs / this.processedRequests)
        : 0;

    const avgLatency =
      this.processedRequests > 0
        ? Number((this.totalProcessingLatencyMs / this.processedRequests).toFixed(2))
        : 0;

    return {
      algorithm: 'FCFS',
      processedRequests: this.processedRequests,
      averageWaitMs: avgWait,
      acceptedRequests: this.acceptedRequests,
      rejectedRequests: this.rejectedRequests,
      averageProcessingLatencyMs: avgLatency,
      activeQueueDepth: this.activeQueueDepth,
      metricScope: 'in_memory_process',
      lastResetAt: this.lastResetAt,
    };
  }

  public reset(): void {
    this.processedRequests = 0;
    this.acceptedRequests = 0;
    this.rejectedRequests = 0;
    this.totalWaitMs = 0;
    this.totalProcessingLatencyMs = 0;
    this.activeQueueDepth = 0;
    this.lastResetAt = new Date().toISOString();
  }
}

export const schedulingMetrics = new MetricsTracker();

