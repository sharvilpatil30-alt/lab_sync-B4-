import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Lab as MongoLab } from './lab.model.js';
import { Booking as MongoBooking } from '../bookings/booking.model.js';
import { MaintenanceRecord as MongoMaintenanceRecord } from '../maintenance/maintenance.model.js';
import { campusDb } from '../persistence/database.js';
import { pool } from '../../config/postgres.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { success, error } from '../../utils/apiResponse.js';

export const labRouter: Router = Router();

// Helper to find lab from Mongo or campusDb
async function findLabByIdOrCode(id: string) {
  // 1. Check MongoDB only if active connection exists
  if (mongoose.connection.readyState === 1) {
    try {
    let lab = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      lab = await MongoLab.findById(id);
    }
    if (!lab) {
      lab = await MongoLab.findOne({ $or: [{ labId: id }, { _id: id }] });
    }
    if (!lab) {
      lab = await MongoLab.findOne({ labId: new RegExp(`^${id}$`, 'i') });
    }
      if (lab) return lab;
    } catch {
      // Mongo offline
    }
  }

  // 2. Check campusDb
  const fromDb = campusDb.labs.get(id) ||
    Array.from(campusDb.labs.values()).find(
      (l) => l.lab_code?.toLowerCase() === id.toLowerCase() || l.name?.toLowerCase().includes(id.toLowerCase())
    );

  if (fromDb) {
    let status = (fromDb as any).operationalStatus || 'available';
    if (status !== 'maintenance' && status !== 'offline') {
      const now = Date.now();
      const hasActiveSession = Array.from(campusDb.bookings.values()).some((b) => {
        if (b.lab_id !== fromDb.id && b.lab_id !== fromDb.lab_code) return false;
        if (!['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) return false;
        const s = new Date(b.start_at).getTime();
        const e = new Date(b.end_at).getTime();
        return now >= s && now <= e;
      });
      status = (status === 'occupied' || hasActiveSession) ? 'occupied' : 'available';
    }

    const labObj: any = {
      _id: fromDb.id,
      id: fromDb.id,
      labId: fromDb.lab_code || fromDb.id,
      name: fromDb.name,
      description: `Official campus laboratory facility: ${fromDb.name}`,
      capacity: fromDb.capacity || 30,
      operationalStatus: status,
      maintenanceStatus: (fromDb as any).maintenanceStatus || '',
      building: 'Main Academic Complex',
      floor: 2,
      save: async () => {},
      toJSON: function () {
        return {
          id: this.id,
          labId: this.labId,
          name: this.name,
          capacity: this.capacity,
          operationalStatus: this.operationalStatus,
          maintenanceStatus: this.maintenanceStatus,
          building: this.building,
          floor: this.floor,
        };
      },
    };
    return labObj;
  }

  return null;
}

// GET /api/v1/labs - List all labs
labRouter.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Try MongoDB
    try {
      const labs = await MongoLab.find({}).sort({ name: 1 });
      if (labs && labs.length > 0) {
        return success(res, labs, 'Labs retrieved successfully');
      }
    } catch {
      // Mongo offline
    }

    // 2. Return from campusDb
    const now = Date.now();
    const list = Array.from(campusDb.labs.values()).map((l) => {
      let status = (l as any).operationalStatus || 'available';
      if (status !== 'maintenance' && status !== 'offline') {
        const hasActiveSession = Array.from(campusDb.bookings.values()).some((b) => {
          if (b.lab_id !== l.id && b.lab_id !== l.lab_code) return false;
          if (!['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) return false;
          const s = new Date(b.start_at).getTime();
          const e = new Date(b.end_at).getTime();
          return now >= s && now <= e;
        });
        status = (status === 'occupied' || hasActiveSession) ? 'occupied' : 'available';
      }
      return {
        _id: l.id,
        id: l.id,
        labId: l.lab_code || l.id,
        name: l.name,
        description: `Department Research Facility: ${l.name}`,
        capacity: l.capacity || 30,
        operationalStatus: status,
        maintenanceStatus: (l as any).maintenanceStatus || '',
        building: 'Main Academic Complex',
        floor: 2,
        investment: l.investment,
      };
    });

    return success(res, list, 'Labs retrieved successfully');
  } catch (err: any) {
    console.error('[Labs] List error:', err);
    return error(res, 'Failed to retrieve labs', [err.message], 500);
  }
});

// GET /api/v1/labs/:id - Get single lab
labRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const lab = await findLabByIdOrCode(req.params.id);
    if (!lab) {
      return error(res, 'Lab facility not found', ['NOT_FOUND'], 404);
    }
    return success(res, lab, 'Lab retrieved successfully');
  } catch (err: any) {
    return error(res, 'Failed to retrieve lab details', [err.message], 500);
  }
});

// POST /api/v1/labs/:id/maintenance - Toggle maintenance state
labRouter.post(
  '/:id/maintenance',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const lab = await findLabByIdOrCode(req.params.id);
      if (!lab) {
        return error(res, 'Lab facility not found', ['NOT_FOUND'], 404);
      }

      const { enabled, action, reason } = req.body;
      let status = req.body.status;

      if (enabled !== undefined) {
        status = enabled ? 'maintenance' : 'available';
      } else if (action === 'ENTERED_MAINTENANCE') {
        status = 'maintenance';
      } else if (action === 'RELEASED_FROM_MAINTENANCE') {
        status = 'available';
      }

      if (!status || !['maintenance', 'available'].includes(status)) {
        return error(
          res,
          "Invalid maintenance status. Must be 'maintenance' or 'available'.",
          ['INVALID_STATUS'],
          400
        );
      }

      const adminUser = req.user;
      const maintenanceReason = reason?.trim() || (status === 'maintenance' ? 'Scheduled maintenance' : '');

      // Update lab entity
      lab.operationalStatus = status;
      lab.maintenanceStatus = maintenanceReason;
      if (typeof lab.save === 'function') {
        try {
          await lab.save();
        } catch {
          // Mongo save optional
        }
      }

      // Update campusDb
      const cLab = campusDb.labs.get(lab.id) || campusDb.labs.get(req.params.id);
      if (cLab) {
        (cLab as any).operationalStatus = status;
        (cLab as any).maintenanceStatus = maintenanceReason;
      }

      return success(
        res,
        lab,
        status === 'maintenance'
          ? `Lab "${lab.name}" is now Under Maintenance. All bookings suspended.`
          : `Lab "${lab.name}" removed from maintenance. Available for student bookings.`
      );
    } catch (err: any) {
      console.error('[Labs] Maintenance toggle error:', err);
      return error(res, 'Failed to update lab maintenance state', [err.message], 500);
    }
  }
);

// PATCH /api/v1/labs/:id - Update lab details (admin/lab assistance only)
labRouter.patch('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lab = await findLabByIdOrCode(req.params.id);
    if (!lab) {
      return error(res, 'Lab facility not found', ['NOT_FOUND'], 404);
    }

    Object.assign(lab, req.body);
    if (typeof lab.save === 'function') {
      try {
        await lab.save();
      } catch {
        // Mongo save optional
      }
    }

    const cLab = campusDb.labs.get(lab.id) || campusDb.labs.get(req.params.id);
    if (cLab) {
      Object.assign(cLab, req.body);
    }

    return success(res, lab, 'Lab details updated successfully');
  } catch (err: any) {
    return error(res, 'Failed to update lab', [err.message], 500);
  }
});
