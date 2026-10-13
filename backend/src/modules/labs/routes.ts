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
    COUNT(r.id)::int AS "totalResources",
    COUNT(r.id) FILTER (
      WHERE UPPER(r.state) = 'AVAILABLE'
    )::int AS "availableResourcesCount"
  FROM public.labs l
  LEFT JOIN public.resources r ON r.lab_id = l.id
  GROUP BY l.id
`;

function formatLab(row: any) {
  return {
    ...row,
    labId: row.lab_code || row.id,
    operationalStatus:
      row.availableResourcesCount > 0 ? 'available' : 'offline',
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
