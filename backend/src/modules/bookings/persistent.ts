import { randomUUID, createHash } from 'node:crypto';
import { PoolClient } from 'pg';
import { pool } from '../../config/postgres.js';
import { AppError } from '../../utils/AppError.js';
import { SchedulingEngine } from '../scheduling/scheduler.js';
import { Booking, Resource } from '../../types/dfd.types.js';

export const bookingSelect = `SELECT b.*, l.lab_code, l.name AS lab_name,
 (SELECT a.after->>'purpose' FROM public.audit_log a WHERE a.action='BOOKING_COMMIT' AND a.after->>'booking_id'=b.id::text ORDER BY a.created_at DESC LIMIT 1) AS purpose,
 (SELECT a.after->>'reason' FROM public.audit_log a WHERE a.action='BOOKING_CANCELLED' AND a.after->>'booking_id'=b.id::text ORDER BY a.created_at DESC LIMIT 1) AS cancellation_reason
 FROM public.bookings b JOIN public.labs l ON l.id=b.lab_id`;
export const isAdmin = (user: any) => ['admin', 'lab_admin'].includes(user.role);
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout = '8s'");
    const result = await fn(db);
    await db.query('COMMIT');
    return result;
  } catch (err: any) {
    await db.query('ROLLBACK');
    if (['23P01', '23505'].includes(err.code))
      throw new AppError('Scheduling conflict: reservation already exists', 409);
    throw err;
  } finally {
    db.release();
  }
}
export async function audit(
  db: PoolClient,
  actor: string,
  action: string,
  before: any,
  after: any,
  correlation = randomUUID(),
) {
  await db.query(
    'INSERT INTO public.audit_log(actor_id,action,before,after,correlation_id) VALUES($1,$2,$3,$4,$5)',
    [actor, action, before, after, correlation],
  );
}
export async function syncResource(db: PoolClient, id: string) {
  await db.query(
    `UPDATE public.resources r SET state=CASE WHEN EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.resource_id=r.id AND b.state IN ('LEASED','CONFIRMED','ACTIVE') AND b.end_at>now()
  ) THEN 'ALLOCATED' ELSE 'AVAILABLE' END, version=version+1, updated_at=now()
  WHERE id=$1 AND state <> 'MAINTENANCE'`,
    [id],
  );
}
export async function createPersistentBooking(db: PoolClient, user: any, body: any) {
  const { labId, resourceId, startTime, endTime } = body;
  if (typeof resourceId !== 'string' || !resourceId || typeof labId !== 'string' || !labId)
    throw new AppError('Select a laboratory and workstation', 400);
  if (
    ![startTime, endTime].every(
      (v) => typeof v === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(v),
    ) ||
    !Number.isFinite(Date.parse(startTime)) ||
    !Number.isFinite(Date.parse(endTime)) ||
    Date.parse(endTime) <= Date.parse(startTime)
  )
    throw new AppError('Provide a valid date/time window with timezone', 400);
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  if (purpose.length < 10 || purpose.length > 2000)
    throw new AppError('Purpose must contain 10–2000 characters', 400);
  const lab = (
    await db.query(
      'SELECT * FROM public.labs WHERE id::text=$1 OR lower(lab_code)=lower($1) FOR UPDATE',
      [labId],
    )
  ).rows[0];
  if (!lab) throw new AppError('Laboratory not found', 404);
  // All writers lock the lab first, then resources, then bookings. This also serializes separate server instances.
  const resources = (
    await db.query('SELECT * FROM public.resources WHERE lab_id=$1 ORDER BY id FOR UPDATE', [
      lab.id,
    ])
  ).rows;
  if (!resources.some((r) => r.id === resourceId))
    throw new AppError('Workstation does not belong to selected laboratory', 400);
  const start = new Date(startTime).toISOString(),
    end = new Date(endTime).toISOString();
  const key = `${user.id}:${
    typeof body.idempotencyKey === 'string'
      ? body.idempotencyKey
      : createHash('sha256')
          .update(JSON.stringify([lab.id, resourceId, start, end, purpose]))
          .digest('hex')
  }`;
  if (key.length > 300) throw new AppError('Idempotency key is too long', 400);
  const replay = (await db.query('SELECT * FROM public.bookings WHERE idempotency_key=$1', [key]))
    .rows[0];
  if (replay) {
    if (
      replay.user_id !== user.id ||
      replay.lab_id !== lab.id ||
      replay.resource_id !== resourceId ||
      new Date(replay.start_at).toISOString() !== start ||
      new Date(replay.end_at).toISOString() !== end
    )
      throw new AppError('Idempotency key belongs to a different request', 409);
    return { booking: { ...replay, purpose }, replay: true };
  }
  if (Date.parse(start) <= Date.now()) throw new AppError('Booking must start in the future', 400);
  const rows = (
    await db.query(
      "SELECT * FROM public.bookings WHERE lab_id=$1 AND state IN ('LEASED','CONFIRMED','ACTIVE','REQUESTED','QUEUED') FOR UPDATE",
      [lab.id],
    )
  ).rows;
  const booking: Booking = {
    id: randomUUID(),
    user_id: user.id,
    lab_id: lab.id,
    state: 'REQUESTED',
    priority: isAdmin(user) ? 0 : user.role === 'faculty' ? 1 : 2,
    start_at: start,
    end_at: end,
    idempotency_key: key,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const result = SchedulingEngine.evaluate(booking, 'PRIORITY', resourceId, {
    resources: new Map(resources.map((r) => [r.id, r as Resource])),
    bookings: new Map(
      rows.map((b) => [
        b.id,
        {
          ...b,
          start_at: new Date(b.start_at).toISOString(),
          end_at: new Date(b.end_at).toISOString(),
        } as Booking,
      ]),
    ),
  });
  if (result.decision !== 'ALLOCATED')
    throw new AppError('Scheduling conflict: workstation is unavailable for this time window', 409);
  const correlation = randomUUID();
  for (const prior of result.preemptableStudentBookings || []) {
    const reason = `Faculty priority reservation in ${lab.lab_code} (${start} – ${end})`;
    await db.query(
      "UPDATE public.bookings SET state='CANCELLED',version=version+1,updated_at=now() WHERE id=$1",
      [prior.id],
    );
    await audit(
      db,
      user.id,
      'BOOKING_CANCELLED',
      prior,
      { booking_id: prior.id, reason },
      correlation,
    );
    await audit(
      db,
      user.id,
      'BOOKING_NOTIFICATION',
      null,
      {
        user: prior.user_id,
        title: 'Booking cancelled — faculty priority',
        message: reason,
        type: 'warning',
        relatedEntityType: 'booking',
        relatedEntityId: prior.id,
      },
      correlation,
    );
  }
  const saved = (
    await db.query(
      `INSERT INTO public.bookings(id,user_id,lab_id,resource_id,state,priority,start_at,end_at,idempotency_key)
    VALUES($1,$2,$3,$4,'CONFIRMED',$5,$6,$7,$8) RETURNING *`,
      [booking.id, user.id, lab.id, resourceId, booking.priority, start, end, key],
    )
  ).rows[0];
  await db.query(
    `INSERT INTO public.scheduling_decisions(booking_id,request_id,policy,decision,lease_id,metrics) VALUES($1,$2,$3,$4,$5,$6)`,
    [booking.id, correlation, result.policy, result.decision, result.leaseId, result.metrics],
  );
  await syncResource(db, resourceId);
  await audit(
    db,
    user.id,
    'BOOKING_COMMIT',
    null,
    { booking_id: booking.id, purpose, decision: result.decision, resource_id: resourceId },
    correlation,
  );
  return {
    booking: {
      ...saved,
      purpose,
      lab_code: lab.lab_code,
      cancelledStudentBookingsCount: result.preemptableStudentBookings?.length || 0,
    },
    replay: false,
  };
}
export async function transitionPersistentBooking(
  db: PoolClient,
  user: any,
  id: string,
  state: string,
  reason?: string,
) {
  if (!['CANCELLED', 'COMPLETED'].includes(state))
    throw new AppError('Only cancellation and completion transitions are supported', 400);
  const location = (await db.query('SELECT lab_id FROM public.bookings WHERE id::text=$1', [id]))
    .rows[0];
  if (!location) throw new AppError('Booking not found', 404);
  await db.query('SELECT id FROM public.labs WHERE id=$1 FOR UPDATE', [location.lab_id]);
  await db.query('SELECT id FROM public.resources WHERE lab_id=$1 ORDER BY id FOR UPDATE', [
    location.lab_id,
  ]);
  const before = (
    await db.query('SELECT * FROM public.bookings WHERE id::text=$1 FOR UPDATE', [id])
  ).rows[0];
  if (before.user_id !== user.id && !isAdmin(user))
    throw new AppError('Not authorized to modify this booking', 403);
  if (before.state === state) return before;
  if (
    !['REQUESTED', 'VALIDATED', 'QUEUED', 'LEASED', 'CONFIRMED', 'ACTIVE', 'WAITLISTED'].includes(
      before.state,
    )
  )
    throw new AppError('Booking is already terminal', 409);
  const after = (
    await db.query(
      'UPDATE public.bookings SET state=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',
      [id, state],
    )
  ).rows[0];
  if (before.resource_id) await syncResource(db, before.resource_id);
  await audit(db, user.id, `BOOKING_${state}`, before, {
    booking_id: id,
    reason: reason || (state === 'COMPLETED' ? 'Resource returned' : 'Cancelled by user'),
  });
  return after;
}
