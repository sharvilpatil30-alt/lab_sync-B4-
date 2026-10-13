import { Router, Request, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { success, error } from '../../utils/apiResponse.js';

export const labRouter = Router();

// GET /api/v1/labs
labRouter.get('/', (_req: Request, res: Response) => {
  const labs = Array.from(campusDb.labs.values()).map((l) => {
    const resourcesInLab = Array.from(campusDb.resources.values()).filter(
      (r) => r.lab_id === l.id
    );
    const availableResources = resourcesInLab.filter((r) => r.state === 'AVAILABLE');

    return {
      id: l.id,
      labId: l.lab_code || l.id,
      name: l.name,
      lab_code: l.lab_code,
      node_id: l.node_id,
      capacity: l.capacity,
      investment: l.investment,
      operationalStatus: availableResources.length > 0 ? 'available' : 'occupied',
      totalResources: resourcesInLab.length,
      availableResourcesCount: availableResources.length,
    };
  });

  return success(res, labs, 'Laboratories retrieved');
});

// GET /api/v1/labs/:labId
labRouter.get('/:labId', (req: Request, res: Response) => {
  const { labId } = req.params;
  const target = Array.from(campusDb.labs.values()).find(
    (l) => l.id.toLowerCase() === labId.toLowerCase() ||
           l.lab_code?.toLowerCase() === labId.toLowerCase()
  );

  if (!target) {
    return error(res, `Laboratory '${labId}' not found`, [], 404);
  }

  const resourcesInLab = Array.from(campusDb.resources.values()).filter(
    (r) => r.lab_id === target.id
  );
  const availableResources = resourcesInLab.filter((r) => r.state === 'AVAILABLE');

  return success(
    res,
    {
      id: target.id,
      labId: target.lab_code || target.id,
      name: target.name,
      lab_code: target.lab_code,
      node_id: target.node_id,
      capacity: target.capacity,
      investment: target.investment,
      operationalStatus: availableResources.length > 0 ? 'available' : 'occupied',
      totalResources: resourcesInLab.length,
      availableResourcesCount: availableResources.length,
      resources: resourcesInLab,
    },
    'Laboratory details retrieved'
  );
});

