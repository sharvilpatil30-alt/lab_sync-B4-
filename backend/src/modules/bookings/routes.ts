import { Router } from 'express';
import { pool } from '../../config/postgres.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  bookingSelect,
  createPersistentBooking,
  transitionPersistentBooking,
  transaction,
  isAdmin,
} from './persistent.js';
export const bookingRouter = Router();
bookingRouter.use(authenticate);
bookingRouter.get(
  ['/', '/my'],
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const all = req.path !== '/my' && isAdmin(req.user);
    const result = await pool.query(
      `${bookingSelect} ${all ? '' : 'WHERE b.user_id=$1'} ORDER BY b.start_at DESC`,
      all ? [] : [req.user.id],
    );
    return success(res, result.rows, 'Bookings retrieved');
  }),
);
bookingRouter.get(
  '/:bookingId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const booking = (
      await pool.query(`${bookingSelect} WHERE b.id::text=$1`, [req.params.bookingId])
    ).rows[0];
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.user_id !== req.user.id && !isAdmin(req.user))
      throw new AppError('Not authorized to view this booking', 403);
    return success(res, booking, 'Booking retrieved');
  }),
);
bookingRouter.post('/preview',asyncHandler(async(req:AuthenticatedRequest,res)=>{
  const result=await transaction(db=>createPersistentBooking(db,req.user,req.body,true));
  return success(res,result.booking,'Conflict preview');
}));
bookingRouter.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await transaction((db) => createPersistentBooking(db, req.user, req.body));
    return success(
      res,
      result.booking,
      result.replay ? 'Existing booking returned' : 'Booking confirmed',
      result.replay ? 200 : 201,
    );
  }),
);
bookingRouter.all(
  ['/:bookingId/cancel', '/:bookingId/return', '/:bookingId/complete', '/:bookingId/status'],
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!['POST', 'PATCH'].includes(req.method)) throw new AppError('Method not allowed', 405);
    const override = req.path.endsWith('/status');
    if (override && !isAdmin(req.user)) throw new AppError('Administrator access required', 403);
    const state = override
      ? req.body.status
      : req.path.endsWith('/cancel')
        ? 'CANCELLED'
        : 'COMPLETED';
    const reason = req.body.reason || req.body.cancellationReason;
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 2000))
      throw new AppError('Invalid reason', 400);
    const booking = await transaction((db) =>
      transitionPersistentBooking(db, req.user, req.params.bookingId, state, reason),
    );
    return success(res, booking, 'Booking updated');
  }),
);
