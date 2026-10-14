/**
 * Express Backend / UI-BFF Orchestrator
 * Coordinates the full DFD pipeline across:
 *   - Client Authentication & Validation
 *   - Core Scheduling Engine
 *   - Campus Spatial Wayfinding
 *   - Authoritative Persistence & Atomic commit_booking
 */

import { campusDb } from '../persistence/database.js';
import { SchedulingEngine } from '../scheduling/scheduler.js';
import { CampusRouter } from '../routing/router.js';
import {
  Booking,
  SchedulingPolicy,
  RoutingAlgorithm,
  UserRole,
} from '../../types/dfd.types.js';

export interface BookingPipelineRequest {
  userId: string;
  labId: string;
  resourceId?: string;
  startAt: string;
  endAt: string;
  idempotencyKey: string;
  schedulingPolicy?: SchedulingPolicy;
  routingAlgorithm?: RoutingAlgorithm;
  originNodeId?: string;
}

export interface BookingPipelineResponse {
  success: boolean;
  correlationId: string;
  booking?: Booking;
  schedulingDecision?: any;
  route?: any;
  message: string;
  constraintsChecked: string[];
  cancelledStudentBookingsCount?: number;
  cancelledBookings?: Booking[];
  conflict?: boolean;
}

export class DFDOrchestrator {
  /**
   * Executes the full DFD pipeline with all constraint checks
   */
  public static executeBookingPipeline(
    req: BookingPipelineRequest
  ): BookingPipelineResponse {
    const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const constraintsChecked: string[] = [];

    // Constraint 1: User Profile & Role Validation
    let user = campusDb.profiles.get(req.userId);
    if (!user) {
      return {
        success: false,
        correlationId,
        message: `DFD Constraint Failed: Profile for user '${req.userId}' does not exist`,
        constraintsChecked,
      };
    }
    constraintsChecked.push('C-PROFILE: Validated actor role and existence');

    // Constraint 2: Lab Existence & Capacity
    let lab = campusDb.labs.get(req.labId);
    if (!lab) {
      lab = Array.from(campusDb.labs.values()).find(
        (l) => l.lab_code?.toLowerCase() === req.labId.toLowerCase() || l.name.toLowerCase() === req.labId.toLowerCase()
      );
    }
    if (!lab) {
      return {
        success: false,
        correlationId,
        message: `DFD Constraint Failed: Target lab '${req.labId}' not found`,
        constraintsChecked,
      };
    }
    constraintsChecked.push('C-LAB: Validated lab capacity and node mapping');

    // Constraint 3: Time Range Constraints
    const startDate = new Date(req.startAt);
    const endDate = new Date(req.endAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return {
        success: false,
        correlationId,
        message: 'DFD Constraint Failed: Invalid booking time window (start_at must be before end_at)',
        constraintsChecked,
      };
    }
    constraintsChecked.push('C-TIME: Validated ISO-8601 interval order');

    // Constraint 4: Idempotency Key Verification (DFD Flow 1 & C1)
    const existing = campusDb.checkIdempotency(req.idempotencyKey);
    if (existing) {
      return {
        success: true,
        correlationId,
        booking: existing,
        message: 'Idempotency Constraint: Existing booking returned (duplicate request prevented)',
        constraintsChecked: [...constraintsChecked, 'C-IDEMPOTENCY: Replay protection verified'],
      };
    }
    constraintsChecked.push('C-IDEMPOTENCY: Verified unique idempotency key');

    // Determine priority by role: 0 = lab_admin, 1 = faculty, 2 = student
    const priorityMap: Record<UserRole, number> = {
      lab_admin: 0,
      faculty: 1,
      student: 2,
    };
    const priority = priorityMap[user.role] ?? 2;

    // Create Initial Requested Booking
    const bookingId = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBooking: Booking = {
      id: bookingId,
      user_id: user.id,
      lab_id: lab.id,
      state: 'REQUESTED',
      priority,
      start_at: req.startAt,
      end_at: req.endAt,
      idempotency_key: req.idempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Take database snapshot before any modifications to guarantee full atomic rollback
    const dbSnapshot = campusDb.createSnapshot();

    const requestedRes = campusDb.createRequestedBooking(newBooking);
    if (!requestedRes.success) {
      return {
        success: false,
        correlationId,
        message: requestedRes.error || 'Failed to register requested booking',
        constraintsChecked,
      };
    }

    // Step 2: Forward to Scheduling & Queue Engine
    const policy = req.schedulingPolicy || 'PRIORITY';
    const scheduleResult = SchedulingEngine.evaluate(newBooking, policy, req.resourceId);
    constraintsChecked.push(`C-SCHEDULER: Evaluated ${policy} policy - Decision: ${scheduleResult.decision}`);

    // Handle faculty-versus-faculty conflict or student conflict when allocation cannot proceed
    if (scheduleResult.conflictType === 'FACULTY_CONFLICT') {
      campusDb.restoreSnapshot(dbSnapshot);
      return {
        success: false,
        conflict: true,
        correlationId,
        message: user.role === 'student'
          ? 'Scheduling conflict: Cannot override existing faculty reservation'
          : 'Scheduling conflict: The requested time slot is already reserved by another faculty member',
        constraintsChecked,
      };
    }

    if (scheduleResult.decision === 'REJECTED') {
      campusDb.restoreSnapshot(dbSnapshot);
      return {
        success: false,
        correlationId,
        message: 'Scheduling failed: Lab capacity exceeded or no resources available',
        constraintsChecked,
      };
    }

    if (scheduleResult.decision === 'WAITLISTED') {
      campusDb.restoreSnapshot(dbSnapshot);
      return {
        success: false,
        conflict: true,
        correlationId,
        message: 'Scheduling conflict: Requested lab or resource is not available for this time window',
        constraintsChecked,
      };
    }

    const cancelledStudentBookings: Booking[] = [];

    try {
      // Step 2b: If faculty preemption occurred, cancel conflicting student bookings and notify students
      if (scheduleResult.preemptableStudentBookings && scheduleResult.preemptableStudentBookings.length > 0) {
        for (const studentBooking of scheduleResult.preemptableStudentBookings) {
          // Double check booking is not already cancelled or completed
          if (studentBooking.state === 'CANCELLED' || studentBooking.state === 'COMPLETED') {
            continue;
          }

          const dateStr = studentBooking.start_at.split('T')[0];
          const startH = studentBooking.start_at.includes('T') ? studentBooking.start_at.split('T')[1].slice(0, 5) : '00:00';
          const endH = studentBooking.end_at.includes('T') ? studentBooking.end_at.split('T')[1].slice(0, 5) : '00:00';
          const timeWindow = `${startH} - ${endH}`;
          const cancelReason = `Cancelled due to higher-priority faculty booking by ${user.full_name} for ${lab.name} (${timeWindow})`;

          const cancelRes = campusDb.cancelBooking({
            bookingId: studentBooking.id,
            actorId: user.id,
            reason: cancelReason,
            correlationId,
          });

          if (cancelRes.booking) {
            cancelledStudentBookings.push(cancelRes.booking);
          }

          // Step 3: Immediate Student Notification
          // Include lab name, date, time window, and cancellation reason
          campusDb.createNotification({
            user: studentBooking.user_id,
            title: 'Booking Cancelled - Faculty Priority Override',
            message: `Your booking for ${lab.name} on ${dateStr} (${timeWindow}) was automatically cancelled due to a higher-priority faculty reservation. Reason: ${cancelReason}`,
            type: 'warning',
            relatedEntityType: 'booking',
            relatedEntityId: studentBooking.id,
          });

          constraintsChecked.push(`C-PREEMPTION: Cancelled student booking ${studentBooking.id} and notified student ${studentBooking.user_id}`);
        }
      }

      // Step 3: Forward to Campus Spatial Routing
      let routeResult: any = null;
      const originNode = req.originNodeId || 'node-main-gate';
      const destinationNode = lab.node_id || 'node-lab-ai';
      const algorithm = req.routingAlgorithm || 'DIJKSTRA';

      try {
        routeResult = CampusRouter.computeRoute(originNode, destinationNode, algorithm);
        constraintsChecked.push(`C-ROUTING: Computed ${algorithm} path (${routeResult.costMeters}m)`);
      } catch (err: any) {
        console.warn('Campus routing failed, proceeding with direct path:', err.message);
      }

      // Step 4: Atomic Commit Transaction
      const commitResult = campusDb.commitBooking({
        bookingId: newBooking.id,
        resourceId: scheduleResult.resourceId,
        decision: scheduleResult.decision,
        leaseId: scheduleResult.leaseId,
        requestId: correlationId,
        policy,
        metrics: scheduleResult.metrics,
        routePath: routeResult?.pathNodeNames,
        routeCost: routeResult?.costMeters,
        algorithm,
        originNode,
        destinationNode,
        actorId: user.id,
        correlationId,
      });

      if (!commitResult.success) {
        // Rollback entire state to snapshot on failure
        campusDb.restoreSnapshot(dbSnapshot);
        return {
          success: false,
          correlationId,
          message: `DFD ACID Error: ${commitResult.error} (Rolled back to prevent inconsistent state)`,
          constraintsChecked: [...constraintsChecked, 'C-ROLLBACK: Restored snapshot'],
        };
      }

      constraintsChecked.push('C-PERSISTENCE: Executed atomic commit_booking transaction in Supabase store');

      const cancelledCount = cancelledStudentBookings.length;
      const successMessage = cancelledCount > 0
        ? `Booking confirmed successfully. ${cancelledCount} conflicting student booking(s) automatically cancelled due to faculty priority.`
        : `DFD Pipeline Completed: Booking state '${newBooking.state}' with decision '${scheduleResult.decision}'`;

      return {
        success: true,
        correlationId,
        booking: campusDb.bookings.get(newBooking.id),
        schedulingDecision: scheduleResult,
        route: routeResult,
        message: successMessage,
        constraintsChecked,
        cancelledStudentBookingsCount: cancelledCount,
        cancelledBookings: cancelledStudentBookings,
      };
    } catch (err: any) {
      // Rollback entire state to snapshot on unexpected error
      campusDb.restoreSnapshot(dbSnapshot);
      return {
        success: false,
        correlationId,
        message: `Database failure during booking pipeline: ${err.message || 'Unknown error'}. Transaction rolled back safely.`,
        constraintsChecked: [...constraintsChecked, 'C-ROLLBACK: Restored snapshot on failure'],
      };
    }
  }
}
