/**
 * DFD & Supabase Schema Verification REST Routes
 */

import { Router, Request, Response } from 'express';
import { DFDConstraintVerifier } from './dfdVerifier.js';
import { DFDOrchestrator, BookingPipelineRequest } from '../ui-bff/orchestrator.js';
import { campusDb } from '../persistence/database.js';

export const dfdRouter: Router = Router();

/**
 * GET /api/v1/dfd/verify
 * Runs live end-to-end audit of all 10 DFD constraints
 */
dfdRouter.get('/verify', (_req: Request, res: Response) => {
  try {
    const report = DFDConstraintVerifier.verifyAll();
    res.status(200).json({
      success: true,
      message: 'DFD Architectural Constraint Verification Complete',
      data: report,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'DFD Verification failed due to internal error',
      error: err.message,
    });
  }
});

/**
 * POST /api/v1/dfd/booking-pipeline
 * Runs a transactional booking request through the complete DFD pipeline:
 * Client -> Scheduling Engine -> Spatial Routing -> Atomic commit_booking
 */
dfdRouter.post('/booking-pipeline', (req: Request, res: Response) => {
  try {
    const payload: BookingPipelineRequest = req.body;
    if (!payload.userId || !payload.labId || !payload.startAt || !payload.endAt || !payload.idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, labId, startAt, endAt, and idempotencyKey are mandatory.',
      });
    }

    const result = DFDOrchestrator.executeBookingPipeline(payload);
    res.status(result.success ? 200 : 422).json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Internal error executing DFD booking pipeline',
      error: err.message,
    });
  }
});

/**
 * GET /api/v1/dfd/schema
 * Exposes the formal Supabase schema definitions and architecture graph
 */
dfdRouter.get('/schema', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      modules: [
        { name: 'Scheduling Engine', focus: 'Scheduling & Queue Logic (FCFS, SJF, Round-Robin, Priority)' },
        { name: 'Campus Spatial Routing', focus: 'Campus Routing Graph (Dijkstra, Bellman-Ford)' },
        { name: 'Persistence & Inventory', focus: 'Authoritative Persistence, 3NF Inventory & commit_booking ACID Transaction' },
        { name: 'Interface Gateway', focus: 'Role Validation, Idempotency Protection & Telemetry' },
      ],
      tables: {
        operational: [
          'public.profiles',
          'public.campus_nodes',
          'public.campus_edges',
          'public.labs',
          'public.resources',
          'public.bookings',
          'public.scheduling_decisions',
          'public.routes',
          'public.audit_log',
        ],
        inventory3NF: [
          'public.equipment_categories',
          'public.suppliers',
          'public.equipment_models',
          'public.purchase_batches',
          'public.asset_events',
          'spec tables (computer_specs, laptop_specs, printer_specs, etc.)',
        ],
      },
      atomicStoredProcedures: [
        'public.commit_booking(...)',
        'public.compensate_booking(...)',
      ],
    },
  });
});

/**
 * GET /api/v1/dfd/status
 * Returns table entity counts and live status
 */
dfdRouter.get('/status', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      profilesCount: campusDb.profiles.size,
      campusNodesCount: campusDb.campusNodes.size,
      campusEdgesCount: campusDb.campusEdges.size,
      labsCount: campusDb.labs.size,
      resourcesCount: campusDb.resources.size,
      bookingsCount: campusDb.bookings.size,
      schedulingDecisionsCount: campusDb.schedulingDecisions.size,
      routesCount: campusDb.routes.size,
      auditLogEntriesCount: campusDb.auditLog.length,
      purchaseBatchesCount: campusDb.purchaseBatches.size,
    },
  });
});
