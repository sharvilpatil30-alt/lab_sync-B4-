import { Router } from 'express';
import { pool } from '../../config/postgres.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
export const notificationRouter = Router();
notificationRouter.use(authenticate);
const select = `SELECT n.id,n.after,n.created_at,EXISTS(SELECT 1 FROM public.audit_log r WHERE r.action='NOTIFICATION_READ' AND r.actor_id=$1 AND r.after->>'notification_id'=n.id::text) AS read FROM public.audit_log n WHERE n.action='BOOKING_NOTIFICATION' AND n.after->>'user'=$1::text`;
notificationRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rows } = await pool.query(select + ' ORDER BY n.created_at DESC', [req.user.id]);
    return success(
      res,
      rows.map((n) => ({
        ...n.after,
        id: n.id,
        read: n.read,
        isRead: n.read,
        createdAt: n.created_at,
      })),
      'Notifications retrieved',
    );
  }),
);
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query(
      `INSERT INTO public.audit_log(actor_id,action,after,correlation_id) SELECT $1,'NOTIFICATION_READ',jsonb_build_object('notification_id',n.id::text),n.id::text FROM public.audit_log n WHERE n.id::text=$2 AND n.action='BOOKING_NOTIFICATION' AND n.after->>'user'=$1::text RETURNING id`,
      [req.user.id, req.params.id],
    );
    if (!result.rowCount) throw new AppError('Notification not found', 404);
    return success(res, { id: req.params.id }, 'Notification read');
  }),
);
notificationRouter.post(
  '/read-all',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query(
      `INSERT INTO public.audit_log(actor_id,action,after,correlation_id) SELECT $1,'NOTIFICATION_READ',jsonb_build_object('notification_id',n.id::text),n.id::text FROM public.audit_log n WHERE n.action='BOOKING_NOTIFICATION' AND n.after->>'user'=$1::text AND NOT EXISTS(SELECT 1 FROM public.audit_log r WHERE r.action='NOTIFICATION_READ' AND r.actor_id=$1 AND r.after->>'notification_id'=n.id::text)`,
      [req.user.id],
    );
    return success(res, { count: result.rowCount }, 'Notifications read');
  }),
);
