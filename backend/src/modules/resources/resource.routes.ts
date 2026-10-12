import { Router, Request, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { pool } from '../../config/postgres.js';
import { success, error } from '../../utils/apiResponse.js';

export const resourceRouter: Router = Router();

// GET /api/v1/resources/available - Canonical endpoint for bookable seat/workstation availability
resourceRouter.get('/available', async (req: Request, res: Response) => {
  try {
    const { labId, startTime, endTime } = req.query;

    if (!labId) {
      return error(res, 'Missing labId parameter', ['MISSING_LAB_ID'], 400);
    }

    const labKey = String(labId);
    const startIso = startTime ? String(startTime) : new Date().toISOString();
    const endIso = endTime ? String(endTime) : new Date(Date.now() + 2 * 3600000).toISOString();

    // 1. Try PostgreSQL if connected
    if (pool.isConnected) {
      try {
        const resourcesQuery = `
          SELECT r.id AS "resourceId", r.lab_id AS "labId", r.label AS name, r.state,
                 EXISTS (
                   SELECT 1 FROM public.bookings b
                   WHERE b.resource_id = r.id
                     AND b.state IN ('LEASED', 'CONFIRMED', 'ACTIVE')
                     AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
                 ) AS is_booked
          FROM public.resources r
          WHERE r.lab_id = $1::uuid OR r.lab_id = (SELECT id FROM public.labs WHERE lab_code = $1 LIMIT 1)
          ORDER BY r.label
        `;
        const { rows } = await pool.query(resourcesQuery, [labKey, startIso, endIso]);
        if (rows && rows.length > 0) {
          const mapped = rows.map((r: any) => ({
            resourceId: r.resourceId,
            labId: r.labId,
            name: r.name,
            available: r.state === 'AVAILABLE' && !r.is_booked,
          }));
          return success(res, { resources: mapped }, 'Available resources retrieved');
        }
      } catch (dbErr) {
        console.warn('[Resource API] PostgreSQL available resources query error, using repository:', dbErr);
      }
    }

    // 2. Fallback to campusDb repository
    const matchingLab = campusDb.labs.get(labKey) ||
      Array.from(campusDb.labs.values()).find(
        (l) => l.lab_code?.toLowerCase() === labKey.toLowerCase() || l.name?.toLowerCase().includes(labKey.toLowerCase())
      );

    const actualLabId = matchingLab ? matchingLab.id : labKey;
    const capacity = matchingLab ? matchingLab.capacity : 30;

    // Retrieve resources for this lab in campusDb
    let labResources = Array.from(campusDb.resources.values()).filter(
      (r) => r.lab_id === actualLabId || (matchingLab && r.lab_id === matchingLab.id)
    );

    // If no explicit resources exist yet for this lab, generate bookable workstations according to lab capacity
    if (labResources.length === 0) {
      const generatedCount = Math.min(Math.max(capacity, 10), 40);
      const prefix = matchingLab?.lab_code || 'WS';
      for (let i = 1; i <= generatedCount; i++) {
        const padded = String(i).padStart(2, '0');
        const resId = `res-${actualLabId.toLowerCase()}-${padded}`;
        if (!campusDb.resources.has(resId)) {
          campusDb.resources.set(resId, {
            id: resId,
            lab_id: actualLabId,
            label: `${prefix}-Seat-${padded}`,
            state: 'AVAILABLE',
            version: 1,
            updated_at: new Date().toISOString(),
          });
        }
      }
      labResources = Array.from(campusDb.resources.values()).filter((r) => r.lab_id === actualLabId);
    }

    // Check overlapping bookings in campusDb
    const startDate = new Date(startIso).getTime();
    const endDate = new Date(endIso).getTime();

    const bookedResourceIds = new Set<string>();
    for (const b of campusDb.bookings.values()) {
      if (b.resource_id && ['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) {
        const bStart = new Date(b.start_at).getTime();
        const bEnd = new Date(b.end_at).getTime();
        // Overlap condition
        if (startDate < bEnd && endDate > bStart) {
          bookedResourceIds.add(b.resource_id);
        }
      }
    }

    const result = labResources.map((r) => ({
      resourceId: r.id,
      labId: actualLabId,
      name: r.label,
      available: r.state === 'AVAILABLE' && !bookedResourceIds.has(r.id),
    }));

    return success(res, { resources: result }, 'Available resources retrieved');
  } catch (err: any) {
    console.error('[Resource API] Available resources error:', err);
    return error(res, 'Failed to fetch available resources', [err.message], 500);
  }
});

// GET /api/v1/resources - List all resources
resourceRouter.get('/', async (_req: Request, res: Response) => {
  const all = Array.from(campusDb.resources.values()).map((r) => ({
    resourceId: r.id,
    id: r.id,
    labId: r.lab_id,
    lab: r.lab_id,
    name: r.label,
    type: 'Workstation',
    operationalStatus: r.state === 'AVAILABLE' ? 'available' : 'occupied',
    availability: r.state === 'AVAILABLE',
  }));
  return success(res, all, 'Resources retrieved');
});
