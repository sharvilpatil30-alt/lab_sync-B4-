import { Router, Request, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { success, error } from '../../utils/apiResponse.js';

export const resourceRouter = Router();

// GET /api/v1/resources/available?labId=...&startTime=...&endTime=...
resourceRouter.get('/available', (req: Request, res: Response) => {
  const { labId, startTime, endTime } = req.query;
  if (!labId) {
    return error(res, 'labId parameter is required', [], 400);
  }

  // Resolve target lab (accepts 'lab-d08', 'D-08', etc.)
  let targetLabId = String(labId);
  const matchedLab = Array.from(campusDb.labs.values()).find(
    (l) => l.id.toLowerCase() === targetLabId.toLowerCase() || l.lab_code?.toLowerCase() === targetLabId.toLowerCase()
  );
  if (matchedLab) {
    targetLabId = matchedLab.id;
  }

  const allLabResources = Array.from(campusDb.resources.values()).filter(
    (r) => r.lab_id === targetLabId
  );

  // Time overlap conflict checking with existing confirmed/leased bookings
  const requestedStart = startTime ? new Date(String(startTime)).getTime() : 0;
  const requestedEnd = endTime ? new Date(String(endTime)).getTime() : Infinity;

  const conflictingBookings = Array.from(campusDb.bookings.values()).filter((b) => {
    if (b.lab_id !== targetLabId) return false;
    if (!['LEASED', 'CONFIRMED', 'ACTIVE'].includes(b.state)) return false;
    const bStart = new Date(b.start_at).getTime();
    const bEnd = new Date(b.end_at).getTime();
    return Math.max(requestedStart, bStart) < Math.min(requestedEnd, bEnd);
  });

  const bookedResourceIds = new Set(conflictingBookings.map((b) => b.resource_id).filter(Boolean));

  const availableList = allLabResources.map((r) => ({
    resourceId: r.id,
    id: r.id,
    labId: r.lab_id,
    name: r.label,
    label: r.label,
    serialNumber: r.serial_no,
    available: r.state === 'AVAILABLE' && !bookedResourceIds.has(r.id),
    state: bookedResourceIds.has(r.id) ? 'ALLOCATED' : r.state,
  }));

  return success(
    res,
    {
      labId: targetLabId,
      total: availableList.length,
      availableCount: availableList.filter((r) => r.available).length,
      resources: availableList,
    },
    'Available resources retrieved'
  );
});

// GET /api/v1/resources
resourceRouter.get('/', (req: Request, res: Response) => {
  const { labId, lab } = req.query;
  let resources = Array.from(campusDb.resources.values());

  const filterLab = labId || lab;
  if (filterLab) {
    const filterStr = String(filterLab).toLowerCase();
    resources = resources.filter(
      (r) => r.lab_id.toLowerCase() === filterStr ||
             campusDb.labs.get(r.lab_id)?.lab_code?.toLowerCase() === filterStr
    );
  }

  return success(res, resources, 'Resources retrieved');
});

// GET /api/v1/resources/:resourceId
resourceRouter.get('/:resourceId', (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const resource = campusDb.resources.get(resourceId);
  if (!resource) {
    return error(res, `Resource with ID '${resourceId}' not found`, [], 404);
  }
  return success(res, resource, 'Resource details retrieved');
});

