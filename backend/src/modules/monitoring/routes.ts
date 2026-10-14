import { Router } from 'express';
import { pool } from '../../config/postgres.js';
import { authenticate } from '../../middleware/authenticate.js';
import { success } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
export const monitoringRouter = Router();
monitoringRouter.use(authenticate);
const available = `r.state <> 'MAINTENANCE' AND NOT EXISTS(SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.state IN ('LEASED','CONFIRMED','ACTIVE') AND b.start_at<=now() AND b.end_at>now())`;
async function alerts() {
  const { rows } = await pool.query(
    "SELECT id,label,updated_at FROM public.resources WHERE state='MAINTENANCE' ORDER BY label",
  );
  return rows.map((r) => ({
    id: r.id,
    severity: 'medium',
    message: `${r.label} is under maintenance`,
    relatedEntityType: 'resource',
    relatedEntityId: r.id,
    resolved: false,
    createdAt: r.updated_at,
  }));
}
monitoringRouter.get(
  '/alerts',
  asyncHandler(async (_req, res) => success(res, await alerts(), 'Maintenance alerts')),
);
monitoringRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const { rows } =
      await pool.query(`WITH counts AS (SELECT l.id, count(r.id)::int total,count(r.id) FILTER (WHERE ${available})::int available,count(r.id) FILTER (WHERE r.state='MAINTENANCE')::int maintenance FROM public.labs l LEFT JOIN public.resources r ON r.lab_id=l.id GROUP BY l.id)
 SELECT count(*)::int AS "totalLabs",count(*) FILTER(WHERE available>0)::int AS "availableLabs",
 count(*) FILTER(WHERE total>0 AND available=0 AND maintenance<total)::int AS "occupiedLabs",
 count(*) FILTER(WHERE total>0 AND maintenance=total)::int AS "maintenanceLabs",
 coalesce(sum(total),0)::int AS "totalResources",coalesce(sum(available),0)::int AS "availableResources",
 (SELECT count(*)::int FROM public.bookings WHERE state IN ('ACTIVE','CONFIRMED','LEASED') AND start_at<=now() AND end_at>now()) AS "activeBookings",
 (SELECT count(*)::int FROM public.bookings WHERE state IN ('QUEUED','WAITLISTED')) AS "queuedBookings" FROM counts`);
    return success(
      res,
      { ...rows[0], alerts: await alerts(), lastUpdated: new Date().toISOString() },
      'Live campus metrics',
    );
  }),
);
