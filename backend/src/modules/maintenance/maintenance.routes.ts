import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { MaintenanceRecord as MongoMaintenanceRecord } from './maintenance.model.js';
import { campusDb } from '../persistence/database.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { success, error } from '../../utils/apiResponse.js';

export const maintenanceRouter = Router();

// In-memory maintenance log cache for campus operations
const campusMaintenanceRecords: Array<{
  id: string;
  labId: string;
  labName: string;
  reason: string;
  action: 'ENTERED_MAINTENANCE' | 'RELEASED_FROM_MAINTENANCE';
  status: 'active' | 'resolved';
  performedBy: string;
  performedByEmail: string;
  timestamp: string;
  resolvedAt?: string;
  notes?: string;
}> = [];

// GET /api/v1/maintenance - List maintenance records
maintenanceRouter.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      try {
        const records = await MongoMaintenanceRecord.find().sort({ timestamp: -1 });
        if (records.length > 0) {
          return success(res, records, 'Maintenance records retrieved');
        }
      } catch {
        // Fallback
      }
    }

    // Return in-memory + active lab maintenance records
    const list = [...campusMaintenanceRecords];
    for (const lab of campusDb.labs.values()) {
      if ((lab as any).operationalStatus === 'maintenance') {
        const existing = list.find((r) => r.labId === lab.id && r.status === 'active');
        if (!existing) {
          list.unshift({
            id: `maint-${lab.id}`,
            labId: lab.id,
            labName: lab.name,
            reason: (lab as any).maintenanceStatus || 'Scheduled laboratory calibration',
            action: 'ENTERED_MAINTENANCE',
            status: 'active',
            performedBy: 'Dr. Vikramaditya',
            performedByEmail: 'admin@ritindia.edu',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return success(res, list, 'Maintenance records retrieved');
  } catch (err: any) {
    return error(res, 'Failed to retrieve maintenance records', [err.message], 500);
  }
});

// POST /api/v1/maintenance - Create maintenance record
maintenanceRouter.post('/', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { labId, labName, reason, action = 'ENTERED_MAINTENANCE', notes = '' } = req.body;
    if (!labId || !reason) {
      return error(res, 'Lab ID and maintenance reason are required', ['MISSING_FIELDS'], 400);
    }

    const lab = campusDb.labs.get(labId);
    const resolvedLabName = labName || (lab ? lab.name : `Lab ${labId}`);

    const record = {
      id: `maint-${Date.now().toString(36)}`,
      labId,
      labName: resolvedLabName,
      reason,
      action: action as 'ENTERED_MAINTENANCE' | 'RELEASED_FROM_MAINTENANCE',
      status: action === 'ENTERED_MAINTENANCE' ? ('active' as const) : ('resolved' as const),
      performedBy: req.user?.name || 'Administrator',
      performedByEmail: req.user?.email || 'admin@ritindia.edu',
      timestamp: new Date().toISOString(),
      notes,
    };

    campusMaintenanceRecords.unshift(record);

    // Update lab status in campusDb
    if (lab) {
      (lab as any).operationalStatus = action === 'ENTERED_MAINTENANCE' ? 'maintenance' : 'available';
      (lab as any).maintenanceStatus = action === 'ENTERED_MAINTENANCE' ? reason : '';
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await MongoMaintenanceRecord.create(record);
      } catch {
        // Mongo optional
      }
    }

    return success(res, record, 'Maintenance work order logged', 201);
  } catch (err: any) {
    return error(res, 'Failed to create maintenance record', [err.message], 500);
  }
});

// GET /api/v1/maintenance/:id
maintenanceRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const match = campusMaintenanceRecords.find((r) => r.id === req.params.id);
  if (match) return success(res, match, 'Maintenance record retrieved');
  return error(res, 'Maintenance record not found', ['NOT_FOUND'], 404);
});

// PATCH /api/v1/maintenance/:id - Update status
maintenanceRouter.patch('/:id', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  const match = campusMaintenanceRecords.find((r) => r.id === req.params.id);
  if (match) {
    if (req.body.status) match.status = req.body.status;
    if (req.body.notes) match.notes = req.body.notes;
    if (match.status === 'resolved') {
      match.resolvedAt = new Date().toISOString();
      const lab = campusDb.labs.get(match.labId);
      if (lab) {
        (lab as any).operationalStatus = 'available';
        (lab as any).maintenanceStatus = '';
      }
    }
    return success(res, match, 'Maintenance record updated');
  }
  return error(res, 'Maintenance record not found', ['NOT_FOUND'], 404);
});
