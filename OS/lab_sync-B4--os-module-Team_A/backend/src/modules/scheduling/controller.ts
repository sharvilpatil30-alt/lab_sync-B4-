import { Response } from 'express';
import { SchedulingAuthRequest } from './middleware.js';
import { validateBookingRequest, evaluateBookingRequest } from './fcfs.js';
import { getDefaultDataProvider } from './dataProvider.js';
import { schedulingMetrics } from './metrics.js';

/**
 * POST /api/v1/scheduling/preview
 * 
 * Computes deterministic FCFS scheduling decision without mutating database state.
 * Validates authentication, authorization, inputs, resource existence and availability.
 */
export async function previewBooking(
  req: SchedulingAuthRequest,
  res: Response
): Promise<void> {
  try {
    const { resourceId, startTime, endTime, algorithm } = req.body || {};

    // 1. Input schema & interval validation
    const validation = validateBookingRequest({
      resourceId,
      startTime,
      endTime,
      algorithm,
    });

    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: validation.code || 'INVALID_INPUT',
          message: validation.error || 'Invalid booking request parameters',
        },
      });
      return;
    }

    const dataProvider = getDefaultDataProvider();

    // 2. Resource existence validation
    const resource = await dataProvider.getResource(resourceId);
    if (!resource) {
      res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: `Resource not found with ID: ${resourceId}`,
        },
      });
      return;
    }

    // 3. Evaluate FCFS scheduling decision (Read-only evaluation)
    const decision = await evaluateBookingRequest(
      {
        resourceId,
        startTime,
        endTime,
        algorithm: algorithm || 'FCFS',
        userId: req.user?.userId,
      },
      {
        dataProvider,
        actor: req.user,
      }
    );

    res.status(200).json({
      decision: decision.decision,
      algorithm: decision.algorithm,
      reason: decision.reason,
    });
  } catch (err: any) {
    console.error('[Scheduling API] Error in previewBooking:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal scheduling evaluation failure',
      },
    });
  }
}

/**
 * GET /api/v1/scheduling/metrics
 * 
 * Returns real operational measurements for the FCFS scheduling policy.
 * Scope: Current server process in-memory metrics window.
 */
export async function getMetrics(
  _req: SchedulingAuthRequest,
  res: Response
): Promise<void> {
  try {
    const metrics = schedulingMetrics.getMetrics();
    res.status(200).json({
      algorithm: metrics.algorithm,
      processedRequests: metrics.processedRequests,
      averageWaitMs: metrics.averageWaitMs,
      acceptedRequests: metrics.acceptedRequests,
      rejectedRequests: metrics.rejectedRequests,
      averageProcessingLatencyMs: metrics.averageProcessingLatencyMs,
      activeQueueDepth: metrics.activeQueueDepth,
      metricScope: metrics.metricScope,
      lastResetAt: metrics.lastResetAt,
    });
  } catch (err: any) {
    console.error('[Scheduling API] Error in getMetrics:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve scheduling metrics',
      },
    });
  }
}

/**
 * POST /api/v1/scheduling/metrics/reset (Optional administrative helper)
 */
export async function resetMetrics(
  _req: SchedulingAuthRequest,
  res: Response
): Promise<void> {
  try {
    schedulingMetrics.reset();
    res.status(200).json({
      success: true,
      message: 'Scheduling metrics reset successfully',
      metrics: schedulingMetrics.getMetrics(),
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset scheduling metrics',
      },
    });
  }
}

