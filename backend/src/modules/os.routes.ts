import { Router } from 'express';
import { handleOSSchedule } from './os.controller';

const router = Router();

// POST endpoint: /api/os/schedule
router.post('/schedule', handleOSSchedule);

export default router;