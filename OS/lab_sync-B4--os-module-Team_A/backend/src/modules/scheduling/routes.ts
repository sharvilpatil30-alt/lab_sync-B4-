import { Router } from 'express';
import { requireSchedulingAuth } from './middleware.js';
import { previewBooking, getMetrics, resetMetrics } from './controller.js';

export const schedulingRouter: Router = Router();

// POST /api/v1/scheduling/preview
schedulingRouter.post('/preview', requireSchedulingAuth, previewBooking);

// GET /api/v1/scheduling/metrics
schedulingRouter.get('/metrics', requireSchedulingAuth, getMetrics);

// POST /api/v1/scheduling/metrics/reset
schedulingRouter.post('/metrics/reset', requireSchedulingAuth, resetMetrics);

export default schedulingRouter;

