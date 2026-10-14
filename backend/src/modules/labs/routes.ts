import { Router, Request, Response } from 'express';
import { pool } from '../../config/postgres.js';
import { success, error } from '../../utils/apiResponse.js';

export const labRouter = Router();

const LAB_QUERY = `
  SELECT
    l.id,
    l.name,
    l.lab_code,
    l.node_id,
    l.capacity,
    l.investment,
    (SELECT a.after FROM audit_log a WHERE a.action='LAB_METADATA_UPDATED' AND a.after->>'lab_id'=l.id::text ORDER BY a.created_at DESC LIMIT 1) AS metadata,
    (SELECT a.after->>'status' FROM audit_log a WHERE a.action='INVENTORY_STATUS_UPDATED' AND a.after->>'targetType'='lab' AND a.after->>'target'=l.id::text ORDER BY a.created_at DESC LIMIT 1) AS managed_status,
    COUNT(r.id) FILTER (WHERE r.state='MAINTENANCE')::int AS maintenance_count,
    COUNT(r.id)::int AS "totalResources",
    COUNT(r.id) FILTER (
      WHERE r.state <> 'MAINTENANCE' AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.state IN ('LEASED','CONFIRMED','ACTIVE') AND b.start_at<=now() AND b.end_at>now())
    )::int AS "availableResourcesCount"
  FROM public.labs l
  LEFT JOIN public.resources r ON r.lab_id = l.id
  GROUP BY l.id
`;

function formatLab(row: any) {
  return {
    ...row,
    ...(row.metadata || {}),
    labId: row.lab_code || row.id,
    operationalStatus:
      row.managed_status === 'offline' ? 'offline' : row.totalResources > 0 && row.maintenance_count === row.totalResources ? 'maintenance' : row.availableResourcesCount > 0 ? 'available' : row.totalResources > 0 ? 'occupied' : 'offline',
  };
}

// GET /api/v1/labs
labRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `${LAB_QUERY} ORDER BY l.lab_code`
    );

    return success(
      res,
      result.rows.map(formatLab),
      'Live laboratories retrieved from PostgreSQL'
    );
  } catch (err) {
    console.error('[Labs] PostgreSQL query failed:', err);
    return error(res, 'Unable to retrieve laboratories', [], 500);
  }
});

// GET /api/v1/labs/:labId
labRouter.get('/:labId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `${LAB_QUERY}
       HAVING l.id::text = $1 OR LOWER(l.lab_code) = LOWER($1)`,
      [req.params.labId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Laboratory not found', [], 404);
    }

    const lab = formatLab(result.rows[0]);

    const resources = await pool.query(
      `SELECT id, lab_id, label, state, version,
              batch_id, serial_no
       FROM public.resources
       WHERE lab_id = $1
       ORDER BY label`,
      [lab.id]
    );

    return success(
      res,
      { ...lab, resources: resources.rows },
      'Live laboratory details retrieved'
    );
  } catch (err) {
    console.error('[Labs] PostgreSQL query failed:', err);
    return error(res, 'Unable to retrieve laboratory', [], 500);
  }
});
