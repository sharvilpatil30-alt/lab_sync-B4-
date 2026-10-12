import {
  BookingRequest,
  SchedulingDecision,
  SchedulingContext,
} from './types.js';
import { getDefaultDataProvider } from './dataProvider.js';
import { schedulingMetrics } from './metrics.js';

// RFC 4122 UUID v1-v5 regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Strict ISO 8601 with timezone offset (Z or +/-HH:mm or +/-HHmm)
const ISO_8601_TIMEZONE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?(?:\d{2})?)$/i;

export interface ValidationResult {
  valid: boolean;
  code?: string;
  error?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Validates booking request inputs according to SHARED CONTRACT.
 */
export function validateBookingRequest(request: BookingRequest): ValidationResult {
  if (!request) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      error: 'Request body is required',
    };
  }

  const { resourceId, startTime, endTime, algorithm } = request;

  if (!resourceId || typeof resourceId !== 'string') {
    return {
      valid: false,
      code: 'INVALID_RESOURCE_ID',
      error: 'Field "resourceId" is required and must be a string',
    };
  }

  if (!UUID_REGEX.test(resourceId.trim())) {
    return {
      valid: false,
      code: 'INVALID_RESOURCE_ID',
      error: 'Field "resourceId" must be a valid UUID',
    };
  }

  if (!startTime || typeof startTime !== 'string') {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP',
      error: 'Field "startTime" is required and must be an ISO timestamp',
    };
  }

  if (!endTime || typeof endTime !== 'string') {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP',
      error: 'Field "endTime" is required and must be an ISO timestamp',
    };
  }

  if (!ISO_8601_TIMEZONE_REGEX.test(startTime.trim())) {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP_FORMAT',
      error: 'Field "startTime" must be a valid ISO 8601 string with timezone (e.g. 2026-10-12T10:00:00Z)',
    };
  }

  if (!ISO_8601_TIMEZONE_REGEX.test(endTime.trim())) {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP_FORMAT',
      error: 'Field "endTime" must be a valid ISO 8601 string with timezone (e.g. 2026-10-12T10:00:00Z)',
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime())) {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP',
      error: 'Field "startTime" is not a valid date',
    };
  }

  if (isNaN(end.getTime())) {
    return {
      valid: false,
      code: 'INVALID_TIMESTAMP',
      error: 'Field "endTime" is not a valid date',
    };
  }

  if (start.getTime() >= end.getTime()) {
    return {
      valid: false,
      code: 'INVALID_TIME_INTERVAL',
      error: 'Invalid time interval: startTime must be strictly before endTime',
    };
  }

  const normalizedAlgo = (algorithm || 'FCFS').toUpperCase();
  if (normalizedAlgo !== 'FCFS') {
    return {
      valid: false,
      code: 'UNSUPPORTED_ALGORITHM',
      error: `Unsupported scheduling algorithm: "${algorithm}". Supported algorithm is FCFS`,
    };
  }

  return {
    valid: true,
    startDate: start,
    endDate: end,
  };
}

/**
 * Deterministic comparison function for FCFS ordering with tie-breaking.
 * Orders primarily by arrival timestamp; breaks ties deterministically
 * using request ID or idempotency key.
 */
export function compareRequestsFCFS(
  a: BookingRequest & { arrivalTimeMs: number; requestId?: string },
  b: BookingRequest & { arrivalTimeMs: number; requestId?: string }
): number {
  if (a.arrivalTimeMs !== b.arrivalTimeMs) {
    return a.arrivalTimeMs - b.arrivalTimeMs;
  }
  const idA = a.requestId || '';
  const idB = b.requestId || '';
  return idA.localeCompare(idB);
}

/**
 * Core FCFS scheduling service function.
 * Evaluates booking eligibility against real resource state and active bookings.
 * 
 * Boundary guarantee:
 * - Does NOT mutate database state.
 * - Respects actual cancellation statuses (CANCELLED bookings do not block).
 * - Distinguishes FCFS policy evaluation from database-level concurrency safety.
 *
 * @param request The booking request parameters
 * @param context Optional scheduling context containing dataProvider, now, actor
 * @returns SchedulingDecision { decision: 'ACCEPT' | 'REJECT', algorithm: 'FCFS', reason: string, details?: ... }
 */
export async function evaluateBookingRequest(
  request: BookingRequest,
  context?: SchedulingContext
): Promise<SchedulingDecision> {
  const startTimePerf = performance.now();
  const evaluationTimestamp = context?.now || new Date();

  // 1. Validate inputs
  const validation = validateBookingRequest(request);
  if (!validation.valid || !validation.startDate || !validation.endDate) {
    const decision: SchedulingDecision = {
      decision: 'REJECT',
      algorithm: 'FCFS',
      reason: validation.error || 'Invalid booking request parameters',
    };
    schedulingMetrics.recordRequest({
      decision: 'REJECT',
      waitTimeMs: 0,
      processingLatencyMs: performance.now() - startTimePerf,
    });
    return decision;
  }

  const { startDate, endDate } = validation;
  const dataProvider = context?.dataProvider || getDefaultDataProvider();

  // 2. Check resource existence
  const resource = await dataProvider.getResource(request.resourceId);
  if (!resource) {
    const decision: SchedulingDecision = {
      decision: 'REJECT',
      algorithm: 'FCFS',
      reason: `Resource not found: ${request.resourceId}`,
    };
    schedulingMetrics.recordRequest({
      decision: 'REJECT',
      waitTimeMs: 0,
      processingLatencyMs: performance.now() - startTimePerf,
    });
    return decision;
  }

  // 3. Check resource operational status
  if (resource.state !== 'AVAILABLE') {
    const decision: SchedulingDecision = {
      decision: 'REJECT',
      algorithm: 'FCFS',
      reason: `Resource is unavailable (current state: ${resource.state})`,
    };
    schedulingMetrics.recordRequest({
      decision: 'REJECT',
      waitTimeMs: 0,
      processingLatencyMs: performance.now() - startTimePerf,
    });
    return decision;
  }

  // 4. Check for overlapping active bookings
  // Active states that block new allocations: LEASED, CONFIRMED, ACTIVE (matching 001_core.sql GiST constraint)
  const overlappingBookings = await dataProvider.getActiveBookingsForResource(
    request.resourceId,
    startDate,
    endDate
  );

  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (60 * 1000)
  );

  if (overlappingBookings.length > 0) {
    const conflicting = overlappingBookings[0];
    const decision: SchedulingDecision = {
      decision: 'REJECT',
      algorithm: 'FCFS',
      reason: `Resource has an overlapping active booking (${conflicting.state}) between ${conflicting.start_at.toISOString()} and ${conflicting.end_at.toISOString()}`,
      details: {
        resourceId: request.resourceId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes,
        waitTimeMs: 0,
        processedAt: evaluationTimestamp.toISOString(),
      },
    };
    schedulingMetrics.recordRequest({
      decision: 'REJECT',
      waitTimeMs: 0,
      processingLatencyMs: performance.now() - startTimePerf,
    });
    return decision;
  }

  // 5. Eligible for booking
  const decision: SchedulingDecision = {
    decision: 'ACCEPT',
    algorithm: 'FCFS',
    reason: 'Resource is available for the requested time slot under FCFS policy',
    details: {
      resourceId: request.resourceId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      durationMinutes,
      waitTimeMs: 0,
      processedAt: evaluationTimestamp.toISOString(),
    },
  };

  schedulingMetrics.recordRequest({
    decision: 'ACCEPT',
    waitTimeMs: 0,
    processingLatencyMs: performance.now() - startTimePerf,
  });

  return decision;
}

