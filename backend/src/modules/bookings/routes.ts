import { Router, Request, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { DFDOrchestrator } from '../ui-bff/orchestrator.js';
import { success, error } from '../../utils/apiResponse.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';

export const bookingRouter = Router();

// GET /api/v1/bookings/my
bookingRouter.get('/my', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;
  const userBookings = Array.from(campusDb.bookings.values()).filter(
    (b) => b.user_id === userId
  );
  return success(res, userBookings, 'User bookings retrieved');
});

// GET /api/v1/bookings
bookingRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;
  const userRole = req.user?.role;

  // If student or faculty, list their own bookings; if admin, list all
  if (userRole === 'admin' || userRole === 'lab_admin') {
    const all = Array.from(campusDb.bookings.values());
    return success(res, all, 'All campus bookings retrieved');
  }

  const userBookings = Array.from(campusDb.bookings.values()).filter(
    (b) => b.user_id === userId
  );
  return success(res, userBookings, 'User bookings retrieved');
});

// GET /api/v1/bookings/:bookingId
bookingRouter.get('/:bookingId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const booking = campusDb.bookings.get(bookingId);
  if (!booking) {
    return error(res, `Booking with ID '${bookingId}' not found`, [], 404);
  }
  return success(res, booking, 'Booking details retrieved');
});

// POST /api/v1/bookings
bookingRouter.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { resourceId, startTime, endTime, purpose, labId, idempotencyKey } = req.body;

    if (!labId && !resourceId) {
      return error(res, 'Either labId or resourceId must be provided', [], 400);
    }
    if (!startTime || !endTime) {
      return error(res, 'startTime and endTime are required', [], 400);
    }

    let targetLabId = labId;
    if (!targetLabId && resourceId) {
      const resource = campusDb.resources.get(resourceId);
      if (resource) targetLabId = resource.lab_id;
    }

    // Resolve lab ID if code was provided (e.g. "D-08" -> "lab-d08")
    if (targetLabId) {
      const matched = Array.from(campusDb.labs.values()).find(
        (l) => l.id === targetLabId || l.lab_code?.toLowerCase() === targetLabId.toLowerCase()
      );
      if (matched) targetLabId = matched.id;
    }

    const key = idempotencyKey || `idemp-${userId}-${targetLabId}-${startTime}-${endTime}`;

    const pipelineResult = DFDOrchestrator.executeBookingPipeline({
      userId,
      labId: targetLabId,
      resourceId,
      startAt: startTime,
      endAt: endTime,
      idempotencyKey: key,
    });

    if (!pipelineResult.success) {
      return error(res, pipelineResult.message, [], 422);
    }

    const isReplay = pipelineResult.message.includes('Idempotency Constraint');
    return success(
      res,
      pipelineResult.booking,
      pipelineResult.message,
      isReplay ? 200 : 201
    );
  } catch (err: any) {
    return error(res, err.message || 'Error processing booking', [], 500);
  }
});

// POST /api/v1/bookings/:bookingId/cancel
bookingRouter.post('/:bookingId/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const { reason } = req.body;
  const userId = req.user?.id || req.user?._id;

  const result = campusDb.cancelBooking({
    bookingId,
    actorId: userId,
    reason,
  });

  if (!result.success) {
    return error(res, result.error || 'Failed to cancel booking', [], 400);
  }

  return success(res, result.booking, 'Booking successfully cancelled');
});

// PATCH /api/v1/bookings/:bookingId/cancel (Frontend fallback)
bookingRouter.patch('/:bookingId/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const { cancellationReason, reason } = req.body;
  const userId = req.user?.id || req.user?._id;

  const result = campusDb.cancelBooking({
    bookingId,
    actorId: userId,
    reason: cancellationReason || reason,
  });

  if (!result.success) {
    return error(res, result.error || 'Failed to cancel booking', [], 400);
  }

  return success(res, result.booking, 'Booking successfully cancelled');
});

// PATCH /api/v1/bookings/:bookingId/status (Admin override)
bookingRouter.patch('/:bookingId/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const { status, reason } = req.body;
  const booking = campusDb.bookings.get(bookingId);
  if (!booking) {
    return error(res, `Booking ${bookingId} not found`, [], 404);
  }

  if (status === 'CANCELLED') {
    const cancelRes = campusDb.cancelBooking({ bookingId, reason });
    return success(res, cancelRes.booking, 'Booking status transitioned to CANCELLED');
  }

  if (status === 'COMPLETED') {
    const completeRes = campusDb.completeBooking({ bookingId });
    return success(res, completeRes.booking, 'Booking status transitioned to COMPLETED');
  }

  booking.state = status;
  booking.updated_at = new Date().toISOString();
  return success(res, booking, `Booking status transitioned to ${status}`);
});

// POST /api/v1/bookings/:bookingId/return
bookingRouter.post('/:bookingId/return', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user?.id || req.user?._id;

  const result = campusDb.completeBooking({
    bookingId,
    actorId: userId,
  });

  if (!result.success) {
    return error(res, result.error || 'Failed to return resource', [], 400);
  }

  return success(res, result.booking, 'Booking successfully returned / completed');
});

// POST /api/v1/bookings/:bookingId/complete
bookingRouter.post('/:bookingId/complete', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user?.id || req.user?._id;

  const result = campusDb.completeBooking({
    bookingId,
    actorId: userId,
  });

  if (!result.success) {
    return error(res, result.error || 'Failed to complete booking', [], 400);
  }

  return success(res, result.booking, 'Booking successfully returned / completed');
});

