/**
 * Team A — Scheduling & Resource Allocation Types
 * Aligned with SHARED CONTRACT v1.0 and database/migrations/001_core.sql
 */

export type SchedulingPolicyType = 'FCFS';

export type DecisionType = 'ACCEPT' | 'REJECT';

export type DbBookingState =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'QUEUED'
  | 'LEASED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPENSATION_REQUIRED';

export type DbResourceState =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ALLOCATED'
  | 'RELEASING'
  | 'MAINTENANCE';

export interface BookingRequest {
  resourceId: string;
  startTime: string; // ISO 8601 with timezone (e.g. 2026-10-12T10:00:00Z)
  endTime: string;   // ISO 8601 with timezone
  algorithm?: string;
  requestId?: string;
  userId?: string;
  priority?: number;
}

export interface SchedulingDecision {
  decision: DecisionType;
  algorithm: string;
  reason: string;
  details?: {
    resourceId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    waitTimeMs: number;
    processedAt: string;
    queuePosition?: number;
  };
}

export interface ResourceRecord {
  id: string;
  lab_id: string;
  label: string;
  state: DbResourceState | string;
  version?: number;
}

export interface BookingRecord {
  id: string;
  user_id: string;
  lab_id: string;
  resource_id: string;
  state: DbBookingState | string;
  start_at: Date;
  end_at: Date;
  priority?: number;
}

export interface ISchedulingDataProvider {
  getResource(resourceId: string): Promise<ResourceRecord | null>;
  getActiveBookingsForResource(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BookingRecord[]>;
}

export interface SchedulingContext {
  dataProvider?: ISchedulingDataProvider;
  now?: Date;
  correlationId?: string;
  actor?: {
    userId: string;
    role: string;
  };
}

export interface SchedulingMetrics {
  algorithm: 'FCFS';
  processedRequests: number;
  averageWaitMs: number;
  acceptedRequests: number;
  rejectedRequests: number;
  averageProcessingLatencyMs: number;
  activeQueueDepth: number;
  metricScope: string;
  lastResetAt: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

