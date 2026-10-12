import { Router, Request, Response } from 'express';
import { CampusRouter } from './router.js';
import { campusDb } from '../persistence/database.js';
import { pool } from '../../config/postgres.js';
import { success, error } from '../../utils/apiResponse.js';

export const routingRouter: Router = Router();

// GET /api/v1/routes/nodes - Retrieve all campus spatial graph nodes
routingRouter.get('/nodes', async (_req: Request, res: Response) => {
  try {
    // If PostgreSQL pool is connected, try to query campus_nodes
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query('SELECT id, name, node_type FROM public.campus_nodes ORDER BY name');
        if (rows && rows.length > 0) {
          const nodes = rows.map((r: any) => ({
            nodeId: r.id,
            id: r.id,
            name: r.name,
            type: (r.node_type || 'landmark').toUpperCase(),
          }));
          return success(res, { nodes }, 'Campus graph nodes retrieved');
        }
      } catch (dbErr) {
        console.warn('[Routing API] PostgreSQL campus_nodes query failed, using persistence repository:', dbErr);
      }
    }

    // Fallback to persisted campus graph in campusDb
    const nodes = Array.from(campusDb.campusNodes.values()).map((n) => ({
      nodeId: n.id,
      id: n.id,
      name: n.name,
      type: (n.node_type || 'landmark').toUpperCase(),
    }));

    return success(res, { nodes }, 'Campus graph nodes retrieved');
  } catch (err: any) {
    console.error('[Routing API] Get nodes error:', err);
    return error(res, 'Failed to retrieve campus nodes', [err.message], 500);
  }
});

// POST /api/v1/routes/compute - Calculate optimal campus path
routingRouter.post('/compute', (req: Request, res: Response) => {
  try {
    const { fromNodeId, toNodeId, originNodeId, destinationNodeId, algorithm = 'dijkstra' } = req.body;
    const startId = fromNodeId || originNodeId;
    const destId = toNodeId || destinationNodeId;

    if (!startId || !destId) {
      return error(
        res,
        'Both origin and destination node IDs are required to compute a campus route.',
        ['MISSING_NODES'],
        400
      );
    }

    const algoUpper = algorithm.toUpperCase() === 'BELLMAN_FORD' || algorithm.toUpperCase() === 'BELLMAN-FORD'
      ? 'BELLMAN_FORD'
      : 'DIJKSTRA';

    // Map lab IDs or node IDs if passed
    let effectiveStart = startId;
    let effectiveDest = destId;

    if (!campusDb.campusNodes.has(effectiveStart)) {
      // Find matching lab or node by name or lab code
      const matchingNode = Array.from(campusDb.campusNodes.values()).find(
        (n) => n.id.toLowerCase() === effectiveStart.toLowerCase() || n.name.toLowerCase().includes(effectiveStart.toLowerCase())
      );
      if (matchingNode) effectiveStart = matchingNode.id;
      else effectiveStart = 'node-main-gate';
    }

    if (!campusDb.campusNodes.has(effectiveDest)) {
      // Check if target is a lab
      const matchingLab = campusDb.labs.get(effectiveDest) ||
        Array.from(campusDb.labs.values()).find(
          (l) => l.lab_code?.toLowerCase() === effectiveDest.toLowerCase() || l.name?.toLowerCase().includes(effectiveDest.toLowerCase())
        );
      if (matchingLab && matchingLab.node_id) {
        effectiveDest = matchingLab.node_id;
      } else {
        const matchingNode = Array.from(campusDb.campusNodes.values()).find(
          (n) => n.id.toLowerCase() === effectiveDest.toLowerCase() || n.name.toLowerCase().includes(effectiveDest.toLowerCase())
        );
        if (matchingNode) effectiveDest = matchingNode.id;
        else effectiveDest = 'node-lab-ai';
      }
    }

    const routeResult = CampusRouter.computeRoute(effectiveStart, effectiveDest, algoUpper);

    return success(
      res,
      {
        path: routeResult.pathNodeNames,
        pathNodeIds: routeResult.pathNodeIds,
        distance: routeResult.costMeters,
        distanceUnit: 'm',
        algorithm: routeResult.algorithm.toLowerCase(),
        origin: routeResult.originNodeName,
        destination: routeResult.destinationNodeName,
        stepDescriptions: routeResult.stepDescriptions,
        executionTimeMs: routeResult.executionTimeMs,
      },
      'Campus route computed successfully'
    );
  } catch (err: any) {
    console.error('[Routing API] Compute route error:', err);
    return error(res, 'Route computation failed', [err.message], 500);
  }
});

// GET /api/v1/routes/algorithms - Supported algorithms list
routingRouter.get('/algorithms', (_req: Request, res: Response) => {
  return success(
    res,
    {
      algorithms: ['dijkstra', 'bellman-ford', 'bfs', 'dfs'],
      default: 'dijkstra',
    },
    'Supported campus routing algorithms'
  );
});
