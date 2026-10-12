import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Booking as MongoBooking } from './booking.model.js';
import { Lab as MongoLab } from '../labs/lab.model.js';
import { campusDb } from '../persistence/database.js';
import { pool } from '../../config/postgres.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { success, error } from '../../utils/apiResponse.js';

export const bookingRouter: Router = Router();

// Helper to find lab from campusDb or MongoDB
async function resolveLab(labId: string) {
  // 1. Check campusDb
  const fromDb = campusDb.labs.get(labId) ||
    Array.from(campusDb.labs.values()).find(
      (l) => l.lab_code?.toLowerCase() === labId.toLowerCase() || l.name?.toLowerCase().includes(labId.toLowerCase())
    );
  if (fromDb) return fromDb;

  // 2. Check MongoDB only if active connection exists
  if (mongoose.connection.readyState === 1) {
    try {
    let mongoLab = null;
    if (labId.match(/^[0-9a-fA-F]{24}$/)) {
      mongoLab = await MongoLab.findById(labId);
    }
    if (!mongoLab) {
      mongoLab = await MongoLab.findOne({ $or: [{ labId }, { _id: labId }] });
    }
    if (!mongoLab) {
      mongoLab = await MongoLab.findOne({ labId: new RegExp(`^${labId}$`, 'i') });
    }
    if (mongoLab) {
      return {
        id: mongoLab.id || mongoLab.labId,
        lab_code: mongoLab.labId,
        name: mongoLab.name,
        capacity: mongoLab.capacity || 30,
        operationalStatus: mongoLab.operationalStatus || 'available',
        maintenanceReason: mongoLab.maintenanceStatus,
      };
    }
    } catch {
      // Mongo offline
    }
  }

  return null;
}

// Helper to resolve resource
function resolveResource(resourceId: string) {
  return campusDb.resources.get(resourceId);
}

// POST /api/v1/bookings - Canonical & backward-compatible booking creation
bookingRouter.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return error(res, 'Authentication required to make a reservation.', ['UNAUTHORIZED'], 401);
    }

    const {
      resourceId,
      startTime,
      endTime,
      labId: rawLabId,
      seatNumber,
      date,
      purpose = 'Academic research and lab workstation session',
      requiredResources = [],
    } = req.body;

    // Time window calculation
    let startIso: string;
    let endIso: string;

    if (startTime && endTime && startTime.includes('T') && endTime.includes('T')) {
      startIso = startTime;
      endIso = endTime;
    } else if (date && startTime && endTime) {
      startIso = new Date(`${date}T${startTime}:00`).toISOString();
      endIso = new Date(`${date}T${endTime}:00`).toISOString();
    } else if (startTime && endTime) {
      startIso = startTime;
      endIso = endTime;
    } else {
      return error(
        res,
        'Invalid booking payload. Please provide resourceId, startTime, and endTime in ISO format.',
        ['MISSING_FIELDS'],
        400
      );
    }

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return error(
        res,
        'Invalid booking time range: startTime must be earlier than endTime.',
        ['INVALID_TIME_RANGE'],
        400
      );
    }

    // Resolve resource and lab
    const effectiveResourceId = resourceId;
    let effectiveLabId = rawLabId;
    let effectiveLab: any = null;

    if (effectiveResourceId) {
      const resObj = resolveResource(effectiveResourceId);
      if (resObj) {
        effectiveLabId = resObj.lab_id;
      }
    }

    if (effectiveLabId) {
      effectiveLab = await resolveLab(effectiveLabId);
    }

    // Check if lab is under maintenance
    if (effectiveLab && (effectiveLab.operationalStatus === 'maintenance' || (effectiveLab as any).maintenanceStatus)) {
      const reason = effectiveLab.maintenanceReason || effectiveLab.maintenanceStatus || 'Scheduled maintenance';
      return error(
        res,
        `Cannot book resource: "${effectiveLab.name}" is currently Under Maintenance (${reason}).`,
        ['LAB_UNDER_MAINTENANCE'],
        400
      );
    }

    // Check conflict (Double Booking Prevention)
    let hasConflict = false;

    // A. Check PostgreSQL if connected
    if (pool.isConnected && effectiveResourceId) {
      try {
        const conflictQuery = `
          SELECT id FROM public.bookings
          WHERE resource_id = $1::uuid
            AND state IN ('LEASED', 'CONFIRMED', 'ACTIVE')
            AND tstzrange(start_at, end_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
          LIMIT 1
        `;
        const { rows } = await pool.query(conflictQuery, [effectiveResourceId, startIso, endIso]);
        if (rows && rows.length > 0) {
          hasConflict = true;
        }
      } catch (dbErr) {
        console.warn('[Bookings API] PG conflict check error, using repository:', dbErr);
      }
    }

    // B. Check campusDb repository
    if (!hasConflict && effectiveResourceId) {
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      for (const b of campusDb.bookings.values()) {
        if (b.resource_id === effectiveResourceId && ['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) {
          const bStart = new Date(b.start_at).getTime();
          const bEnd = new Date(b.end_at).getTime();
          if (startMs < bEnd && endMs > bStart) {
            hasConflict = true;
            break;
          }
        }
      }
    }

    if (hasConflict) {
      return error(
        res,
        'Selected workstation is already reserved for the chosen time slot. Please choose another workstation or adjust the time.',
        ['SEAT_CONFLICT'],
        409
      );
    }

    // Unique booking ID
    const bookingCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Persist into campusDb
    campusDb.bookings.set(bookingCode, {
      id: bookingCode,
      user_id: user.id || user.userId || 'usr-student-01',
      lab_id: effectiveLabId || 'lab-d01',
      resource_id: effectiveResourceId,
      state: 'CONFIRMED',
      priority: user.role === 'admin' ? 0 : user.role === 'faculty' ? 1 : 2,
      start_at: startIso,
      end_at: endIso,
      idempotency_key: `idemp-${bookingCode}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Also persist into MongoDB if connected
    try {
      await MongoBooking.create({
        bookingId: bookingCode,
        user: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        labId: effectiveLabId,
        labName: effectiveLab ? effectiveLab.name : 'Campus Research Lab',
        seatNumber: seatNumber || 1,
        date: startIso.split('T')[0],
        startTime: startIso.split('T')[1]?.slice(0, 5) || '10:00',
        endTime: endIso.split('T')[1]?.slice(0, 5) || '12:00',
        purpose: purpose.trim(),
        status: 'CONFIRMED',
        requiredResources: Array.isArray(requiredResources) ? requiredResources : [],
      });
    } catch {
      // MongoDB optional
    }

    const payload = {
      bookingId: bookingCode,
      id: bookingCode,
      resourceId: effectiveResourceId,
      labId: effectiveLabId,
      labName: effectiveLab ? effectiveLab.name : 'Campus Research Lab',
      status: 'CONFIRMED',
      startTime: startIso,
      endTime: endIso,
      purpose,
      createdAt: new Date().toISOString(),
    };

    return success(res, payload, 'Booking reservation confirmed successfully', 201);
  } catch (err: any) {
    console.error('[Bookings API] Create booking error:', err);
    return error(res, 'Failed to create booking', [err.message], 500);
  }
});

// GET /api/v1/bookings/my - Canonical endpoint for current student bookings
bookingRouter.get('/my', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const userId = user.id || user.userId;

    // Collect from campusDb
    const list = Array.from(campusDb.bookings.values())
      .filter((b) => b.user_id === userId || !b.user_id)
      .map((b) => {
        const lab = campusDb.labs.get(b.lab_id);
        const resource = b.resource_id ? campusDb.resources.get(b.resource_id) : null;
        return {
          bookingId: b.id,
          id: b.id,
          resourceId: b.resource_id,
          labId: b.lab_id,
          labName: lab ? lab.name : 'Laboratory Facility',
          resourceName: resource ? resource.label : 'Workstation',
          status: b.state,
          startTime: b.start_at,
          endTime: b.end_at,
          date: b.start_at.split('T')[0],
          purpose: 'Campus Research & Lab Reservation',
          createdAt: b.created_at,
        };
      });

    return success(res, { bookings: list }, 'Student bookings retrieved');
  } catch (err: any) {
    console.error('[Bookings API] List my error:', err);
    return error(res, 'Failed to retrieve bookings', [err.message], 500);
  }
});

// GET /api/v1/bookings - List bookings (supports query filters)
bookingRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const userId = user.id || user.userId;

    const list = Array.from(campusDb.bookings.values())
      .filter((b) => user.role === 'admin' || b.user_id === userId)
      .map((b) => {
        const lab = campusDb.labs.get(b.lab_id);
        const resource = b.resource_id ? campusDb.resources.get(b.resource_id) : null;
        return {
          bookingId: b.id,
          id: b.id,
          resourceId: b.resource_id,
          labId: b.lab_id,
          labName: lab ? lab.name : 'Laboratory Facility',
          resourceName: resource ? resource.label : 'Workstation',
          status: b.state,
          startTime: b.start_at,
          endTime: b.end_at,
          date: b.start_at.split('T')[0],
          purpose: 'Campus Lab Session',
          createdAt: b.created_at,
        };
      });

    return success(res, list, 'Bookings retrieved');
  } catch (err: any) {
    return error(res, 'Failed to list bookings', [err.message], 500);
  }
});

// GET /api/v1/bookings/:id - Single booking details
bookingRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const booking = campusDb.bookings.get(req.params.id) ||
      Array.from(campusDb.bookings.values()).find((b) => b.id === req.params.id);

    if (!booking) {
      return error(res, 'Booking reservation record not found', ['NOT_FOUND'], 404);
    }

    const lab = campusDb.labs.get(booking.lab_id);
    const resource = booking.resource_id ? campusDb.resources.get(booking.resource_id) : null;

    const formatted = {
      bookingId: booking.id,
      id: booking.id,
      resourceId: booking.resource_id,
      labId: booking.lab_id,
      labName: lab ? lab.name : 'Laboratory Facility',
      resourceName: resource ? resource.label : 'Workstation',
      status: booking.state,
      startTime: booking.start_at,
      endTime: booking.end_at,
      date: booking.start_at.split('T')[0],
      purpose: 'Lab Reservation',
      createdAt: booking.created_at,
    };

    return success(res, formatted, 'Booking retrieved');
  } catch (err: any) {
    return error(res, 'Failed to retrieve booking', [err.message], 500);
  }
});

// POST & PATCH /api/v1/bookings/:id/cancel - Cancellation endpoint
const cancelHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const booking = campusDb.bookings.get(req.params.id);

    if (!booking) {
      return error(res, 'Booking reservation not found', ['NOT_FOUND'], 404);
    }

    booking.state = 'CANCELLED';
    booking.updated_at = new Date().toISOString();

    if (booking.resource_id) {
      const resObj = campusDb.resources.get(booking.resource_id);
      if (resObj) {
        resObj.state = 'AVAILABLE';
      }
    }

    return success(
      res,
      { bookingId: booking.id, id: booking.id, status: 'CANCELLED' },
      'Booking reservation cancelled successfully'
    );
  } catch (err: any) {
    return error(res, 'Failed to cancel booking', [err.message], 500);
  }
};

bookingRouter.post('/:id/cancel', authenticate, cancelHandler);
bookingRouter.patch('/:id/cancel', authenticate, cancelHandler);
