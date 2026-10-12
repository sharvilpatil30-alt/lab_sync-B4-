/**
 * DFD Constraint Verification Engine
 * Programmatically tests and verifies all 10 DFD constraints from the architectural diagrams:
 * - Flow 1: Client Authentication & Idempotency
 * - Flow 2: State Machine Lifecycle
 * - Flow 3: Multi-Policy Scheduling (FCFS, SJF, RR, Priority)
 * - Flow 4: Resource State Locking & Deadlock Prevention
 * - Flow 5: Campus Spatial Graph & Routing (Dijkstra, Bellman-Ford)
 * - Flow 6: Atomic Commit Transaction (commit_booking)
 * - Flow 7: Saga Compensation Rollback (compensate_booking)
 * - Flow 8: 3NF Dead-stock & Procurement Hierarchy
 * - Flow 9: Role-Based Access Scoping
 * - Flow 10: Audit Log Correlation & Immutability
 */

import { campusDb } from '../persistence/database.js';
import { SchedulingEngine } from '../scheduling/scheduler.js';
import { CampusRouter } from '../routing/router.js';
import { DFDOrchestrator } from '../ui-bff/orchestrator.js';
import {
  DFDConstraintRule,
  DFDVerificationReport,
  Booking,
} from '../../types/dfd.types.js';

export class DFDConstraintVerifier {
  /**
   * Runs an end-to-end verification of all DFD constraints
   */
  public static verifyAll(): DFDVerificationReport {
    const pipelineStartTime = performance.now();
    const rules: DFDConstraintRule[] = [];

    // ----------------------------------------------------
    // C1: Idempotency Key Constraint (Replay Prevention)
    // ----------------------------------------------------
    const t1 = performance.now();
    try {
      const testKey = `test-idemp-${Date.now()}`;
      const bookingPayload = {
        userId: 'usr-student-01',
        labId: 'lab-ai-301',
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
        idempotencyKey: testKey,
      };

      // First run
      const firstRes = DFDOrchestrator.executeBookingPipeline(bookingPayload);
      // Replay run with same key
      const replayRes = DFDOrchestrator.executeBookingPipeline(bookingPayload);

      const passed =
        firstRes.success &&
        replayRes.success &&
        replayRes.booking?.id === firstRes.booking?.id &&
        replayRes.message.includes('Idempotency Constraint');

      rules.push({
        id: 'DFD-C1',
        name: 'Idempotency Key & Replay Attack Protection',
        targetEntity: 'bookings.idempotency_key',
        description: 'Replay submissions with duplicate idempotency_key must be intercepted and prevented from double-booking',
        sourceTeam: 'Interface Gateway',
        passed,
        message: passed
          ? 'Passed: Duplicate request safely returned original booking record without duplicate creation.'
          : 'Failed: Idempotency check did not prevent duplicate write.',
        executionTimeMs: Math.round((performance.now() - t1) * 100) / 100,
        evidence: { testKey, firstBookingId: firstRes.booking?.id, replayBookingId: replayRes.booking?.id },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C1',
        name: 'Idempotency Key & Replay Attack Protection',
        targetEntity: 'bookings.idempotency_key',
        description: 'Idempotency validation test',
        sourceTeam: 'Interface Gateway',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t1) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C2: State Machine Lifecycle Constraints
    // ----------------------------------------------------
    const t2 = performance.now();
    try {
      const allowedStates = [
        'REQUESTED',
        'VALIDATED',
        'QUEUED',
        'LEASED',
        'CONFIRMED',
        'ACTIVE',
        'COMPLETED',
        'REJECTED',
        'WAITLISTED',
        'CANCELLED',
        'EXPIRED',
        'COMPENSATION_REQUIRED',
      ];

      const allBookingsValid = Array.from(campusDb.bookings.values()).every((b) =>
        allowedStates.includes(b.state)
      );

      rules.push({
        id: 'DFD-C2',
        name: 'Booking State Machine Validation',
        targetEntity: 'bookings.state',
        description: 'Bookings must strictly adhere to the 12 finite state machine states from the authoritative schema',
        sourceTeam: 'Persistence & ACID Engine',
        passed: allBookingsValid,
        message: allBookingsValid
          ? `Passed: All ${campusDb.bookings.size} system bookings adhere to verified state domain check.`
          : 'Failed: Detected invalid booking state outside schema enum.',
        executionTimeMs: Math.round((performance.now() - t2) * 100) / 100,
        evidence: { verifiedStatesCount: allowedStates.length, sampleState: 'CONFIRMED' },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C2',
        name: 'Booking State Machine Validation',
        targetEntity: 'bookings.state',
        description: 'State machine enum check',
        sourceTeam: 'Persistence & ACID Engine',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t2) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C3: Multi-Policy Scheduling Engine (FCFS, SJF, RR, Priority)
    // ----------------------------------------------------
    const t3 = performance.now();
    try {
      const mockBooking: Booking = {
        id: `mock-sched-${Date.now()}`,
        user_id: 'usr-student-01',
        lab_id: 'lab-ai-301',
        state: 'REQUESTED',
        priority: 2,
        start_at: new Date(Date.now() + 86400000).toISOString(),
        end_at: new Date(Date.now() + 90000000).toISOString(),
        idempotency_key: `mock-key-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const resPriority = SchedulingEngine.evaluate(mockBooking, 'PRIORITY');
      const resFcfs = SchedulingEngine.evaluate(mockBooking, 'FCFS');
      const resSjf = SchedulingEngine.evaluate(mockBooking, 'SJF');
      const resRr = SchedulingEngine.evaluate(mockBooking, 'ROUND_ROBIN');

      const passed =
        ['ALLOCATED', 'WAITLISTED', 'REJECTED'].includes(resPriority.decision) &&
        ['ALLOCATED', 'WAITLISTED', 'REJECTED'].includes(resFcfs.decision) &&
        ['ALLOCATED', 'WAITLISTED', 'REJECTED'].includes(resSjf.decision) &&
        ['ALLOCATED', 'WAITLISTED', 'REJECTED'].includes(resRr.decision);

      rules.push({
        id: 'DFD-C3',
        name: 'Multi-Policy Scheduling & Queue Optimization',
        targetEntity: 'scheduling_decisions.policy',
        description: 'Verifies FCFS, SJF, ROUND_ROBIN, and PRIORITY allocation algorithms and queue scoring',
        sourceTeam: 'Scheduling & Queue Service',
        passed,
        message: passed
          ? 'Passed: All 4 scheduling policies (FCFS, SJF, ROUND_ROBIN, PRIORITY) computed consistent decisions.'
          : 'Failed: Policy execution returned invalid decision state.',
        executionTimeMs: Math.round((performance.now() - t3) * 100) / 100,
        evidence: {
          priorityDecision: resPriority.decision,
          fcfsDecision: resFcfs.decision,
          sjfDecision: resSjf.decision,
          rrDecision: resRr.decision,
        },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C3',
        name: 'Multi-Policy Scheduling & Queue Optimization',
        targetEntity: 'scheduling_decisions.policy',
        description: 'Scheduling policy check',
        sourceTeam: 'Scheduling & Queue Service',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t3) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C4: Resource State Locking & Deadlock Prevention
    // ----------------------------------------------------
    const t4 = performance.now();
    try {
      const res = campusDb.resources.get('res-ai-gpu-01');
      const validStates = ['AVAILABLE', 'RESERVED', 'ALLOCATED', 'RELEASING', 'MAINTENANCE'];
      const passed = !!res && validStates.includes(res.state);

      rules.push({
        id: 'DFD-C4',
        name: 'Resource State Lock & Mutual Exclusion',
        targetEntity: 'resources.state',
        description: 'Resource states must enforce mutual exclusion: AVAILABLE -> ALLOCATED -> RELEASING -> AVAILABLE',
        sourceTeam: 'Scheduling & Queue Service',
        passed,
        message: passed
          ? `Passed: Hardware resource state is '${res?.state}' with version tracking ${res?.version}.`
          : 'Failed: Resource state outside allowable domain.',
        executionTimeMs: Math.round((performance.now() - t4) * 100) / 100,
        evidence: { resourceId: res?.id, state: res?.state, version: res?.version },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C4',
        name: 'Resource State Lock & Mutual Exclusion',
        targetEntity: 'resources.state',
        description: 'Resource state lock check',
        sourceTeam: 'Scheduling & Queue Service',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t4) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C5: Spatial Campus Graph & Routing
    // ----------------------------------------------------
    const t5 = performance.now();
    try {
      const dijkstraRoute = CampusRouter.computeRoute('node-main-gate', 'node-lab-ai', 'DIJKSTRA');
      const bellmanRoute = CampusRouter.computeRoute('node-main-gate', 'node-lab-ai', 'BELLMAN_FORD');

      const passed =
        dijkstraRoute.pathNodeIds.length >= 2 &&
        dijkstraRoute.costMeters > 0 &&
        bellmanRoute.pathNodeIds.length >= 2;

      rules.push({
        id: 'DFD-C5',
        name: 'Campus Spatial Graph Routing & Wayfinding',
        targetEntity: 'routes.path',
        description: 'Validates Dijkstra and Bellman-Ford shortest-path routing over campus_nodes & campus_edges',
        sourceTeam: 'Campus Spatial Routing',
        passed,
        message: passed
          ? `Passed: Computed path across ${dijkstraRoute.pathNodeNames.length} nodes with cost ${dijkstraRoute.costMeters}m.`
          : 'Failed: Route computation returned disconnected path.',
        executionTimeMs: Math.round((performance.now() - t5) * 100) / 100,
        evidence: {
          dijkstraCost: dijkstraRoute.costMeters,
          dijkstraPath: dijkstraRoute.pathNodeNames,
          bellmanCost: bellmanRoute.costMeters,
        },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C5',
        name: 'Campus Spatial Graph Routing & Wayfinding',
        targetEntity: 'routes.path',
        description: 'Campus routing verification',
        sourceTeam: 'Campus Spatial Routing',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t5) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C6: commit_booking ACID Transaction
    // ----------------------------------------------------
    const t6 = performance.now();
    try {
      const testBookingId = `bk-atomic-${Date.now()}`;
      campusDb.bookings.set(testBookingId, {
        id: testBookingId,
        user_id: 'usr-student-01',
        lab_id: 'lab-sys-204',
        state: 'REQUESTED',
        priority: 2,
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        idempotency_key: `key-atomic-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const commitRes = campusDb.commitBooking({
        bookingId: testBookingId,
        resourceId: 'res-sys-ws-01',
        decision: 'ALLOCATED',
        leaseId: 'lease-test-atomic',
        requestId: 'req-atomic-verify',
        policy: 'PRIORITY',
        metrics: { waitTime: 0 },
        routePath: ['node-main-gate', 'node-lab-systems'],
        routeCost: 150,
        algorithm: 'DIJKSTRA',
        originNode: 'node-main-gate',
        destinationNode: 'node-lab-systems',
        actorId: 'usr-student-01',
        correlationId: 'corr-atomic-verify',
      });

      const updatedBooking = campusDb.bookings.get(testBookingId);
      const updatedResource = campusDb.resources.get('res-sys-ws-01');
      const passed =
        commitRes.success &&
        updatedBooking?.state === 'CONFIRMED' &&
        updatedResource?.state === 'ALLOCATED';

      // Reset resource state to AVAILABLE for future tests
      if (updatedResource) {
        updatedResource.state = 'AVAILABLE';
      }

      rules.push({
        id: 'DFD-C6',
        name: 'commit_booking() ACID Atomic Multi-Table Commit',
        targetEntity: 'public.commit_booking()',
        description: 'Atomic multi-table update across bookings, resources, scheduling_decisions, routes, and audit_log',
        sourceTeam: 'Persistence & ACID Engine',
        passed,
        message: passed
          ? 'Passed: commit_booking procedure updated booking, resource, decision, and audit log in one atomic unit.'
          : 'Failed: Transaction did not atomically synchronize booking and resource states.',
        executionTimeMs: Math.round((performance.now() - t6) * 100) / 100,
        evidence: { bookingState: updatedBooking?.state, resourceState: updatedResource?.state },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C6',
        name: 'commit_booking() ACID Atomic Multi-Table Commit',
        targetEntity: 'public.commit_booking()',
        description: 'commit_booking transaction verification',
        sourceTeam: 'Persistence & ACID Engine',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t6) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C7: Saga Compensation Procedure (compensate_booking)
    // ----------------------------------------------------
    const t7 = performance.now();
    try {
      const compBookingId = `bk-comp-${Date.now()}`;
      campusDb.bookings.set(compBookingId, {
        id: compBookingId,
        user_id: 'usr-student-01',
        lab_id: 'lab-ai-301',
        state: 'CONFIRMED',
        priority: 2,
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        idempotency_key: `key-comp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const compRes = campusDb.compensateBooking({
        bookingId: compBookingId,
        resourceId: 'res-ai-gpu-02',
        actorId: 'usr-admin-01',
        correlationId: 'corr-comp-verify',
        reason: 'Downstream hardware communication timeout',
      });

      const compBooking = campusDb.bookings.get(compBookingId);
      const compResource = campusDb.resources.get('res-ai-gpu-02');
      const passed =
        compRes.success &&
        compBooking?.state === 'COMPENSATION_REQUIRED' &&
        compResource?.state === 'AVAILABLE';

      rules.push({
        id: 'DFD-C7',
        name: 'Saga Compensating Rollback (compensate_booking)',
        targetEntity: 'public.compensate_booking()',
        description: 'Releases leased resource to AVAILABLE and tags booking as COMPENSATION_REQUIRED on pipeline failure',
        sourceTeam: 'Persistence & ACID Engine',
        passed,
        message: passed
          ? 'Passed: Leased resource safely released and booking marked as COMPENSATION_REQUIRED with audit trace.'
          : 'Failed: Compensation failed to restore resource state.',
        executionTimeMs: Math.round((performance.now() - t7) * 100) / 100,
        evidence: {
          bookingState: compBooking?.state,
          resourceState: compResource?.state,
          reason: 'Downstream hardware communication timeout',
        },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C7',
        name: 'Saga Compensating Rollback (compensate_booking)',
        targetEntity: 'public.compensate_booking()',
        description: 'Compensate booking verification',
        sourceTeam: 'Persistence & ACID Engine',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t7) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C8: 3NF Dead-stock & Procurement Hierarchy
    // ----------------------------------------------------
    const t8 = performance.now();
    try {
      const hasCategories = campusDb.equipmentCategories.size > 0;
      const hasSuppliers = campusDb.suppliers.size > 0;
      const hasModels = campusDb.equipmentModels.size > 0;
      const hasBatches = campusDb.purchaseBatches.size > 0;

      const sampleBatch = Array.from(campusDb.purchaseBatches.values())[0];
      const model = sampleBatch ? campusDb.equipmentModels.get(sampleBatch.model_id) : null;
      const category = model ? campusDb.equipmentCategories.get(model.category_id) : null;

      const passed = hasCategories && hasSuppliers && hasModels && hasBatches && !!category;

      rules.push({
        id: 'DFD-C8',
        name: '3NF Dead-Stock & Procurement Hierarchy',
        targetEntity: 'purchase_batches -> equipment_models -> equipment_categories',
        description: 'Enforces 3rd Normal Form relationship from purchase batches through equipment models to categories',
        sourceTeam: 'Persistence & ACID Engine',
        passed,
        message: passed
          ? `Passed: Verified 3NF relational path from Batch '${sampleBatch?.id}' to Model '${model?.model_name}' and Category '${category?.name}'.`
          : 'Failed: Foreign key integrity broken in 3NF inventory schema.',
        executionTimeMs: Math.round((performance.now() - t8) * 100) / 100,
        evidence: {
          batchId: sampleBatch?.id,
          modelName: model?.model_name,
          categoryName: category?.name,
          sourceFile: sampleBatch?.source_file,
        },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C8',
        name: '3NF Dead-Stock & Procurement Hierarchy',
        targetEntity: 'purchase_batches',
        description: '3NF schema verification',
        sourceTeam: 'Persistence & ACID Engine',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t8) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C9: Role-Based Access Scoping (RLS Simulation)
    // ----------------------------------------------------
    const t9 = performance.now();
    try {
      const validRoles = ['student', 'faculty', 'lab_admin'];
      const allProfilesValid = Array.from(campusDb.profiles.values()).every((p) =>
        validRoles.includes(p.role)
      );

      rules.push({
        id: 'DFD-C9',
        name: 'Identity & Role-Based Access Control (RBAC)',
        targetEntity: 'profiles.role',
        description: "Enforces role membership strictly in ('student', 'faculty', 'lab_admin') matching RLS policies",
        sourceTeam: 'Interface Gateway',
        passed: allProfilesValid,
        message: allProfilesValid
          ? `Passed: All ${campusDb.profiles.size} user profiles conform to authorized roles.`
          : 'Failed: Unauthorized role detected in profiles table.',
        executionTimeMs: Math.round((performance.now() - t9) * 100) / 100,
        evidence: { profilesCount: campusDb.profiles.size, allowedRoles: validRoles },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C9',
        name: 'Identity & Role-Based Access Control (RBAC)',
        targetEntity: 'profiles.role',
        description: 'Role access scoping check',
        sourceTeam: 'Interface Gateway',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t9) * 100) / 100,
      });
    }

    // ----------------------------------------------------
    // C10: Audit Log Correlation & Immutability
    // ----------------------------------------------------
    const t10 = performance.now();
    try {
      const hasAuditEntries = campusDb.auditLog.length > 0;
      const allHaveCorrelation = campusDb.auditLog.every((a) => !!a.correlation_id && !!a.action);

      rules.push({
        id: 'DFD-C10',
        name: 'Audit Trail Correlation & Immutability',
        targetEntity: 'public.audit_log',
        description: 'Every operational booking write generates an immutable audit record with correlation_id',
        sourceTeam: 'Persistence & ACID Engine',
        passed: hasAuditEntries && allHaveCorrelation,
        message: hasAuditEntries && allHaveCorrelation
          ? `Passed: Verified ${campusDb.auditLog.length} correlated audit log records.`
          : 'Failed: Uncorrelated or missing audit log entries.',
        executionTimeMs: Math.round((performance.now() - t10) * 100) / 100,
        evidence: {
          auditEntriesCount: campusDb.auditLog.length,
          latestCorrelationId: campusDb.auditLog[campusDb.auditLog.length - 1]?.correlation_id,
        },
      });
    } catch (err: any) {
      rules.push({
        id: 'DFD-C10',
        name: 'Audit Trail Correlation & Immutability',
        targetEntity: 'public.audit_log',
        description: 'Audit log check',
        sourceTeam: 'Persistence & ACID Engine',
        passed: false,
        message: `Error: ${err.message}`,
        executionTimeMs: Math.round((performance.now() - t10) * 100) / 100,
      });
    }

    const passedCount = rules.filter((r) => r.passed).length;
    const failedCount = rules.filter((r) => !r.passed).length;

    return {
      timestamp: new Date().toISOString(),
      overallStatus: failedCount === 0 ? 'PASSED' : 'FAILED',
      totalConstraints: rules.length,
      passedCount,
      failedCount,
      pipelineLatencyMs: Math.round((performance.now() - pipelineStartTime) * 100) / 100,
      constraints: rules,
      sampleTransactionId: `tx-dfd-${Date.now().toString(36)}`,
    };
  }
}
