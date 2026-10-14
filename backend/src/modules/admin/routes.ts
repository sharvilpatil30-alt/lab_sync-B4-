import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { pool } from '../../config/postgres.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { success } from '../../utils/apiResponse.js';
import { transaction, audit, isAdmin } from '../bookings/persistent.js';
export const adminRouter = Router();
const admin = (req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
  isAdmin(req.user) ? next() : next(new AppError('Administrator access required', 403));

// Profile fields not present in the original schema are persisted in the audit event.
adminRouter.patch(
  '/users/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (['role', 'id', 'email', 'user_metadata', 'app_metadata'].some((k) => k in req.body))
      throw new AppError('Identity and role cannot be edited here', 403);
    const { name, department, profile } = req.body;
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 120 ||
      typeof department !== 'string' ||
      department.length > 120 ||
      typeof profile?.phone !== 'string' ||
      profile.phone.length > 40
    )
      throw new AppError('Invalid profile fields', 400);
    const result = await transaction(async (db) => {
      const before = (
        await db.query('SELECT * FROM profiles WHERE id=$1 FOR UPDATE', [req.user.id])
      ).rows[0];
      await db.query('UPDATE profiles SET full_name=$2 WHERE id=$1', [req.user.id, name.trim()]);
      const after = {
        ...req.user,
        name: name.trim(),
        department,
        profile: { phone: profile.phone },
      };
      await audit(db, req.user.id, 'PROFILE_UPDATED', before, after);
      return after;
    });
    return success(res, result, 'Profile saved');
  }),
);

export async function changeInventory(
  db: any,
  user: any,
  id: string,
  kind: 'lab' | 'resource',
  status: string,
) {
  if (!['available', 'maintenance', 'offline'].includes(status))
    throw new AppError(
      'Allocation is controlled by bookings; choose available or maintenance',
      400,
    );
  const lab =
    kind === 'lab'
      ? (await db.query('SELECT id FROM labs WHERE id::text=$1 OR lab_code=$1', [id])).rows[0]
      : (await db.query('SELECT lab_id AS id FROM resources WHERE id::text=$1', [id])).rows[0];
  if (!lab) throw new AppError('Target not found', 404);
  await db.query('SELECT id FROM labs WHERE id=$1 FOR UPDATE', [lab.id]);
  const rows = (
    await db.query(
      `SELECT * FROM resources WHERE lab_id=$1 ${kind === 'resource' ? 'AND id::text=$2' : ''} ORDER BY id FOR UPDATE`,
      kind === 'resource' ? [lab.id, id] : [lab.id],
    )
  ).rows;
  const ids = rows.map((r: any) => r.id);
  const busy = (
    await db.query(
      "SELECT 1 FROM bookings WHERE (resource_id=ANY($1::uuid[]) OR (booking_scope='WHOLE_LAB' AND lab_id=(SELECT lab_id FROM resources WHERE id=ANY($1::uuid[]) LIMIT 1))) AND state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED') AND end_at>now() LIMIT 1",
      [ids],
    )
  ).rowCount;
  if (busy) throw new AppError('Existing reservations prevent this inventory change', 409);
  await db.query(
    'UPDATE resources SET state=$2,version=version+1,updated_at=now() WHERE id=ANY($1::uuid[])',
    [ids, status === 'available' ? 'AVAILABLE' : 'MAINTENANCE'],
  );
  await audit(db, user.id, 'INVENTORY_STATUS_UPDATED', rows, {
    target: id,
    targetType: kind,
    status,
  });
  return { id, status };
}
adminRouter.patch(
  '/resources/:id',
  authenticate,
  admin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = await transaction(async (db) => {
      if (req.body.operationalStatus)
        await changeInventory(db, req.user, req.params.id, 'resource', req.body.operationalStatus);
      else {
        const resource = (
          await db.query('SELECT * FROM resources WHERE id::text=$1', [req.params.id])
        ).rows[0];
        if (!resource) throw new AppError('Resource not found', 404);
        await db.query('SELECT id FROM labs WHERE id=$1 FOR UPDATE', [resource.lab_id]);
        if (req.body.lab && req.body.lab !== resource.lab_id)
          throw new AppError(
            'Moving inventory between labs requires a reviewed inventory import',
            400,
          );
        if (
          typeof req.body.name !== 'string' ||
          !req.body.name.trim() ||
          req.body.name.length > 200
        )
          throw new AppError('Valid resource name required', 400);
        await db.query(
          'UPDATE resources SET label=$2,version=version+1,updated_at=now() WHERE id=$1',
          [resource.id, req.body.name.trim()],
        );
        await audit(db, req.user.id, 'RESOURCE_METADATA_UPDATED', resource, {
          resource_id: resource.id,
          type: String(req.body.type || 'Workstation').slice(0, 80),
          description: String(req.body.description || '').slice(0, 2000),
          maintenanceStatus: String(req.body.maintenanceStatus || '').slice(0, 200),
        });
      }
      return (await db.query('SELECT * FROM resources WHERE id::text=$1', [req.params.id])).rows[0];
    });
    return success(res, data, 'Resource updated');
  }),
);
adminRouter.patch(
  '/labs/:id',
  authenticate,
  admin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await transaction(async (db) => {
      const before = (
        await db.query('SELECT * FROM labs WHERE id::text=$1 OR lab_code=$1 FOR UPDATE', [
          req.params.id,
        ])
      ).rows[0];
      if (!before) throw new AppError('Lab not found', 404);
      if (req.body.operationalStatus)
        await changeInventory(db, req.user, before.id, 'lab', req.body.operationalStatus);
      if (req.body.name !== undefined) {
        if (
          typeof req.body.name !== 'string' ||
          !req.body.name.trim() ||
          req.body.name.length > 200 ||
          !Number.isInteger(req.body.capacity) ||
          req.body.capacity < 0 ||
          req.body.capacity > 10000
        )
          throw new AppError('Invalid lab name or capacity', 400);
        await db.query('UPDATE labs SET name=$2,capacity=$3 WHERE id=$1', [
          before.id,
          req.body.name.trim(),
          req.body.capacity,
        ]);
        await audit(db, req.user.id, 'LAB_METADATA_UPDATED', before, {
          lab_id: before.id,
          description: String(req.body.description || '').slice(0, 2000),
          building: String(req.body.building || '').slice(0, 200),
          floor: String(req.body.floor ?? '').slice(0, 30),
        });
      }
    });
    const row = (
      await pool.query('SELECT * FROM labs WHERE id::text=$1 OR lab_code=$1', [req.params.id])
    ).rows[0];
    return success(res, { ...row, operationalStatus: req.body.operationalStatus }, 'Lab updated');
  }),
);
adminRouter.post(
  '/labs/:id/maintenance',
  authenticate,
  admin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!['ENTERED_MAINTENANCE', 'RELEASED_FROM_MAINTENANCE'].includes(req.body.action))
      throw new AppError('Invalid maintenance action', 400);
    const data = await transaction((db) =>
      changeInventory(
        db,
        req.user,
        req.params.id,
        'lab',
        req.body.action === 'ENTERED_MAINTENANCE' ? 'maintenance' : 'available',
      ),
    );
    return success(res, data, 'Lab maintenance updated');
  }),
);
adminRouter.get(
  '/admin/audit',
  authenticate,
  admin,
  asyncHandler(async (_req, res) =>
    success(
      res,
      (await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200')).rows,
      'Recent persisted audit events',
    ),
  ),
);
adminRouter.get(
  '/admin/scheduling',
  authenticate,
  admin,
  asyncHandler(async (_req, res) =>
    success(
      res,
      (
        await pool.query(
          'SELECT s.*,b.state,b.start_at,b.end_at,l.lab_code FROM scheduling_decisions s JOIN bookings b ON b.id=s.booking_id JOIN labs l ON l.id=b.lab_id ORDER BY s.created_at DESC LIMIT 200',
        )
      ).rows,
      'Persisted scheduling decisions',
    ),
  ),
);
adminRouter.get(
  '/reports/dashboard',
  authenticate,
  admin,
  asyncHandler(async (req, res) => {
    const end = req.query.endDate
      ? new Date(String(req.query.endDate) + 'T23:59:59.999+05:30')
      : new Date();
    const start = req.query.startDate
      ? new Date(String(req.query.startDate) + 'T00:00:00+05:30')
      : new Date(+end - 30 * 86400000);
    if (
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      start >= end ||
      +end - +start > 366 * 86400000
    )
      throw new AppError('Select a valid range of at most one year', 400);
    const bookings = (
      await pool.query('SELECT * FROM bookings WHERE start_at<$2 AND end_at>$1', [start, end])
    ).rows;
    const labs = (await pool.query('SELECT * FROM labs')).rows,
      resources = (await pool.query('SELECT * FROM resources')).rows;
    const hours = (b: any) =>
      ['CONFIRMED', 'ACTIVE', 'COMPLETED', 'LEASED'].includes(b.state)
        ? Math.max(
            0,
            Math.min(+new Date(b.end_at), +end) - Math.max(+new Date(b.start_at), +start),
          ) / 3600000
        : 0;
    const duration = (+end - +start) / 3600000;
    const resourceUtilization = resources.map((r) => {
      const total = bookings
        .filter((b) => b.resource_id === r.id || (b.booking_scope === 'WHOLE_LAB' && b.lab_id === r.lab_id))
        .reduce((n, b) => n + hours(b), 0);
      return {
        resourceId: r.id,
        resourceName: r.label,
        type: 'Workstation',
        totalHoursUsed: total,
        utilizationRate: (total / duration) * 100,
      };
    });
    const labUtilization = labs.map((l) => {
      const capacity = resources.filter((r) => r.lab_id === l.id).length;
      const total = bookings.filter((b) => b.lab_id === l.id).reduce((n, b) => n + hours(b) * (b.booking_scope === 'WHOLE_LAB' ? capacity : 1), 0);
      return {
        labId: l.id,
        labName: l.name,
        totalHoursBooked: total,
        bookingCount: bookings.filter((b) => b.lab_id === l.id).length,
        utilizationRate: capacity ? (total / (duration * capacity)) * 100 : 0,
      };
    });
    const trends = new Map<string, any>();
    const hourCounts = new Map<string, number>();
    for (const b of bookings) {
      const date = new Date(b.start_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const t = trends.get(date) || { date, confirmed: 0, queued: 0, completed: 0, cancelled: 0 };
      const field = ['CONFIRMED', 'ACTIVE', 'LEASED'].includes(b.state)
        ? 'confirmed'
        : ['QUEUED', 'WAITLISTED'].includes(b.state)
          ? 'queued'
          : b.state === 'COMPLETED'
            ? 'completed'
            : b.state === 'CANCELLED'
              ? 'cancelled'
              : null;
      if (field) t[field]++;
      trends.set(date, t);
      if (hours(b) > 0) {
        const h =
          new Date(b.start_at).toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
          }) + ':00 IST';
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
    }
    const queued = (
      await pool.query(
        "SELECT DISTINCT s.booking_id,b.state FROM scheduling_decisions s JOIN bookings b ON b.id=s.booking_id WHERE s.decision='WAITLISTED' AND b.start_at<$2 AND b.end_at>$1",
        [start, end],
      )
    ).rows;
    return success(
      res,
      {
        labUtilization,
        resourceUtilization,
        bookingTrends: [...trends.values()].sort((a, b) => a.date.localeCompare(b.date)),
        summary: {
          totalBookings: bookings.length,
          averageUtilization: resources.length
            ? resourceUtilization.reduce((n, r) => n + r.utilizationRate, 0) / resources.length
            : 0,
          peakHour:
            [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
            'No allocated sessions',
          queueResolutionRate: queued.length
            ? (100 *
                queued.filter((b) => ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(b.state))
                  .length) /
              queued.length
            : null,
        },
      },
      'Measured resource-hours within selected range',
    );
  }),
);
