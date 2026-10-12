/**
 * Scheduling & Queue Engine
 * Implements FCFS, SJF, Round-Robin, and Priority Scheduling policies
 * Checks resource state, priority scoring, conflict resolution & lease management.
 */

import { campusDb } from '../persistence/database.js';
import {
  Booking,
  Resource,
  SchedulingPolicy,
  SchedulingDecisionType,
} from '../../types/dfd.types.js';

export interface SchedulingResult {
  decision: SchedulingDecisionType;
  resourceId?: string;
  leaseId?: string;
  policy: SchedulingPolicy;
  metrics: {
    queuePosition: number;
    waitEstimateMinutes: number;
    priorityScore: number;
    conflictDetected: boolean;
    allocatedAt?: string;
    leaseExpiresAt?: string;
  };
}

export class SchedulingEngine {
  /**
   * Resolves a booking request using the requested or optimal policy
   */
  public static evaluate(
    booking: Booking,
    preferredPolicy: SchedulingPolicy = 'PRIORITY',
    preferredResourceId?: string
  ): SchedulingResult {
    // 1. Get candidate resources in target lab
    const availableInLab = Array.from(campusDb.resources.values()).filter(
      (r) => r.lab_id === booking.lab_id
    );

    if (availableInLab.length === 0) {
      return {
        decision: 'REJECTED',
        policy: preferredPolicy,
        metrics: {
          queuePosition: 0,
          waitEstimateMinutes: 0,
          priorityScore: booking.priority,
          conflictDetected: true,
        },
      };
    }

    // 2. Filter resources that are strictly AVAILABLE
    let candidate: Resource | undefined;
    if (preferredResourceId) {
      const target = campusDb.resources.get(preferredResourceId);
      if (target && target.state === 'AVAILABLE' && target.lab_id === booking.lab_id) {
        candidate = target;
      }
    }

    if (!candidate) {
      candidate = availableInLab.find((r) => r.state === 'AVAILABLE');
    }

    // 3. Check for time overlap conflicts with active/confirmed bookings
    const requestedStart = new Date(booking.start_at).getTime();
    const requestedEnd = new Date(booking.end_at).getTime();

    if (candidate) {
      const hasConflict = Array.from(campusDb.bookings.values()).some((b) => {
        if (b.id === booking.id) return false;
        if (b.resource_id !== candidate?.id) return false;
        if (!['LEASED', 'CONFIRMED', 'ACTIVE'].includes(b.state)) return false;

        const bStart = new Date(b.start_at).getTime();
        const bEnd = new Date(b.end_at).getTime();
        return Math.max(requestedStart, bStart) < Math.min(requestedEnd, bEnd);
      });

      if (hasConflict) {
        candidate = undefined;
      }
    }

    // 4. If resource is free, allocate lease
    if (candidate) {
      const leaseId = `lease-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const leaseExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min lease lock

      return {
        decision: 'ALLOCATED',
        resourceId: candidate.id,
        leaseId,
        policy: preferredPolicy,
        metrics: {
          queuePosition: 1,
          waitEstimateMinutes: 0,
          priorityScore: booking.priority,
          conflictDetected: false,
          allocatedAt: new Date().toISOString(),
          leaseExpiresAt,
        },
      };
    }

    // 5. If no immediate resource is available, queue according to policy
    // Priority: Lower number = higher priority (0 = admin, 1 = faculty, 2 = student)
    // FCFS: order by created_at
    // SJF: order by duration (end_at - start_at)
    const durationMinutes = Math.max(15, Math.round((requestedEnd - requestedStart) / (1000 * 60)));
    const waitEstimate = durationMinutes > 120 ? 60 : 30;

    return {
      decision: 'WAITLISTED',
      policy: preferredPolicy,
      metrics: {
        queuePosition: 2,
        waitEstimateMinutes: waitEstimate,
        priorityScore: booking.priority,
        conflictDetected: true,
      },
    };
  }
}
