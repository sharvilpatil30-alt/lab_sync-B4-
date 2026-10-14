import { Router } from 'express';
import { pool } from '../../config/postgres.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
export const resourceRouter = Router();
resourceRouter.get(
  '/available',
  asyncHandler(async (req, res) => {
    const { labId, startTime, endTime } = req.query;
    if (
      typeof labId !== 'string' ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      !Number.isFinite(Date.parse(startTime)) ||
      !Number.isFinite(Date.parse(endTime)) ||
      Date.parse(startTime) >= Date.parse(endTime)
    )
      throw new AppError('A laboratory and valid time window are required', 400);
    const lab = (
      await pool.query(
        'SELECT id FROM public.labs WHERE id::text=$1 OR lower(lab_code)=lower($1)',
        [labId],
      )
    ).rows[0];
    if (!lab) throw new AppError('Laboratory not found', 404);
    const { rows } = await pool.query(
      `SELECT r.id AS "resourceId", r.id, r.lab_id AS "labId", r.label AS name,r.state,
    (r.state <> 'MAINTENANCE' AND NOT EXISTS(SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED') AND b.start_at<$3::timestamptz AND b.end_at>$2::timestamptz)) AS available,
    (r.state <> 'MAINTENANCE' AND EXISTS(SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.priority=2 AND b.state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED') AND b.start_at<$3::timestamptz AND b.end_at>$2::timestamptz) AND NOT EXISTS(SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.priority<2 AND b.state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED') AND b.start_at<$3::timestamptz AND b.end_at>$2::timestamptz)) AS preemptable
    FROM public.resources r WHERE r.lab_id=$1 ORDER BY r.label`,
      [lab.id, startTime, endTime],
    );
    return success(
      res,
      {
        labId: lab.id,
        total: rows.length,
        availableCount: rows.filter((r) => r.available).length,
        resources: rows,
      },
      'Live seat availability',
    );
  }),
);
resourceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = req.query.labId || req.query.lab;
    const { rows } = await pool.query(
      `SELECT r.*,l.lab_code FROM public.resources r JOIN public.labs l ON l.id=r.lab_id ${filter ? 'WHERE l.id::text=$1 OR lower(l.lab_code)=lower($1)' : ''} ORDER BY r.label`,
      filter ? [filter] : [],
    );
    return success(res, rows, 'Live resources');
  }),
);
resourceRouter.get(
  '/:resourceId',
  asyncHandler(async (req, res) => {
    const resource = (
      await pool.query('SELECT * FROM public.resources WHERE id::text=$1', [req.params.resourceId])
    ).rows[0];
    if (!resource) throw new AppError('Resource not found', 404);
    return success(res, resource, 'Resource retrieved');
  }),
);
