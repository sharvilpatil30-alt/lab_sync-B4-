import { Router, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { success, error } from '../../utils/apiResponse.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';

export const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return error(res, 'User ID not identified', [], 401);
  }

  const notifications = campusDb.getNotificationsForUser(userId);
  return success(res, notifications, 'Notifications retrieved successfully');
});

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch('/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?._id;

  const marked = campusDb.markNotificationAsRead(id, userId);
  if (!marked) {
    return error(res, `Notification '${id}' not found or unauthorized`, [], 404);
  }

  return success(res, { id }, 'Notification marked as read');
});

// POST /api/v1/notifications/read-all
notificationRouter.post('/read-all', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return error(res, 'User ID not identified', [], 401);
  }

  const count = campusDb.markAllNotificationsAsRead(userId);
  return success(res, { count }, 'All notifications marked as read');
});
