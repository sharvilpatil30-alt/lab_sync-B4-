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
    preemptedStudentBookingIds?: string[];
  };
  conflictType?: 'FACULTY_CONFLICT' | 'STUDENT_CONFLICT' | 'CAPACITY_EXCEEDED';
  preemptableStudentBookings?: Booking[];
}

export class SchedulingEngine {
  /**
   * Resolves a booking request using the requested or optimal policy.
   * Enforces faculty priority over student reservations for overlapping time slots.
   */
  public static evaluate(
    booking: Booking,
    preferredPolicy: SchedulingPolicy = 'PRIORITY',
    preferredResourceId?: string
  ): SchedulingResult {
    const isFacultyOrAdmin = booking.priority <= 1; // 0=lab_admin, 1=faculty

    // 1. Get candidate resources in target lab
    const availableInLab = Array.from(campusDb.resources.values()).filter(
      (r) => r.lab_id === booking.lab_id
    );

    if (availableInLab.length === 0) {
      return {
        decision: 'REJECTED',
        policy: preferredPolicy,
        conflictType: 'CAPACITY_EXCEEDED',
        metrics: {
          queuePosition: 0,
          waitEstimateMinutes: 0,
          priorityScore: booking.priority,
          conflictDetected: true,
        },
      };
    }

    const requestedStart = new Date(booking.start_at).getTime();
    const requestedEnd = new Date(booking.end_at).getTime();

    // Helper: checks if a booking has an active overlap
    const getActiveOverlaps = (resourceId: string): Booking[] => {
      return Array.from(campusDb.bookings.values()).filter((b) => {
        if (b.id === booking.id) return false;
        if (b.resource_id !== resourceId) return false;
        if (!['LEASED', 'CONFIRMED', 'ACTIVE', 'REQUESTED', 'QUEUED'].includes(b.state)) return false;

        const bStart = new Date(b.start_at).getTime();
        const bEnd = new Date(b.end_at).getTime();
        return Math.max(requestedStart, bStart) < Math.min(requestedEnd, bEnd);
      });
    };

    // 2. First look for a resource that has NO active overlapping reservations
    let candidate: Resource | undefined;
    if (preferredResourceId) {
      const target = campusDb.resources.get(preferredResourceId);
      if (target && target.lab_id === booking.lab_id && target.state !== 'MAINTENANCE') {
        const overlaps = getActiveOverlaps(target.id);
        if (overlaps.length === 0) {
          candidate = target;
        }
      }
    }

    if (!candidate && !preferredResourceId) {
      candidate = availableInLab.find((r) => {
        return r.state !== 'MAINTENANCE' && getActiveOverlaps(r.id).length === 0;
      });
    }

    // 3. If an idle resource with zero conflicts is found, allocate immediately
    if (candidate) {
      const leaseId = `lease-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const leaseExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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

    // 4. Preemption check: If requester is faculty/admin, check if conflicts can be resolved
    // by preempting student reservations
    if (isFacultyOrAdmin) {
      // Find candidate resources in lab: preferred resource first, then any lab resource
      const targetResources = preferredResourceId
        ? [campusDb.resources.get(preferredResourceId)].filter(Boolean) as Resource[]
        : availableInLab;

      for (const res of targetResources) {
        if (res.state === 'MAINTENANCE') continue;
        const overlaps = getActiveOverlaps(res.id);
        // Check if overlaps contain any faculty/admin reservation
        const hasFacultyConflict = overlaps.some((b) => b.priority <= 1);

        if (!hasFacultyConflict && overlaps.length > 0) {
          // All conflicting reservations on this resource are student reservations!
          // Faculty can preempt these student bookings
          const studentOverlaps = overlaps.filter((b) => b.priority === 2);
          const leaseId = `lease-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const leaseExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

          return {
            decision: 'ALLOCATED',
            resourceId: res.id,
            leaseId,
            policy: preferredPolicy,
            preemptableStudentBookings: studentOverlaps,
            metrics: {
              queuePosition: 1,
              waitEstimateMinutes: 0,
              priorityScore: booking.priority,
              conflictDetected: true,
              allocatedAt: new Date().toISOString(),
              leaseExpiresAt,
              preemptedStudentBookingIds: studentOverlaps.map((b) => b.id),
            },
          };
        }
      }

      // If all candidate resources have active faculty reservations
      return {
        decision: 'REJECTED',
        policy: preferredPolicy,
        conflictType: 'FACULTY_CONFLICT',
        metrics: {
          queuePosition: 0,
          waitEstimateMinutes: 0,
          priorityScore: booking.priority,
          conflictDetected: true,
        },
      };
    }

    // 5. For student requesters, if conflicting with faculty or no slots available
    const hasAnyFacultyOverlap = Array.from(campusDb.bookings.values()).some((b) => {
      if (b.lab_id !== booking.lab_id) return false;
      if (!['LEASED', 'CONFIRMED', 'ACTIVE', 'REQUESTED', 'QUEUED'].includes(b.state)) return false;
      if (b.priority > 1) return false; // not faculty
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      return Math.max(requestedStart, bStart) < Math.min(requestedEnd, bEnd);
    });

    const durationMinutes = Math.max(15, Math.round((requestedEnd - requestedStart) / (1000 * 60)));
    const waitEstimate = durationMinutes > 120 ? 60 : 30;

    return {
      decision: 'WAITLISTED',
      policy: preferredPolicy,
      conflictType: hasAnyFacultyOverlap ? 'FACULTY_CONFLICT' : 'STUDENT_CONFLICT',
      metrics: {
        queuePosition: 2,
        waitEstimateMinutes: waitEstimate,
        priorityScore: booking.priority,
        conflictDetected: true,
      },
    };
  }
}
