import { Router, Response } from 'express';
import { campusDb } from '../persistence/database.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { success, error } from '../../utils/apiResponse.js';

export const monitoringRouter = Router();

// GET /api/v1/monitoring/overview
monitoringRouter.get('/overview', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalLabs = campusDb.labs.size;
    let availableLabs = 0;
    let maintenanceLabs = 0;
    let occupiedLabs = 0;

    const now = Date.now();
    for (const l of campusDb.labs.values()) {
      let op = (l as any).operationalStatus;
      if (!op) {
        const hasActiveSession = Array.from(campusDb.bookings.values()).some((b) => {
          if (b.lab_id !== l.id && b.lab_id !== l.lab_code) return false;
          if (!['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) return false;
          const s = new Date(b.start_at).getTime();
          const e = new Date(b.end_at).getTime();
          return now >= s && now <= e;
        });
        op = hasActiveSession ? 'occupied' : 'available';
      }
      if (op === 'maintenance') maintenanceLabs++;
      else if (op === 'occupied') occupiedLabs++;
      else availableLabs++;
    }

    const totalResources = campusDb.resources.size;
    let availableResources = 0;
    for (const r of campusDb.resources.values()) {
      if (r.state === 'AVAILABLE') availableResources++;
    }

    let activeBookings = 0;
    let queuedBookings = 0;
    for (const b of campusDb.bookings.values()) {
      if (['CONFIRMED', 'LEASED', 'ACTIVE'].includes(b.state)) activeBookings++;
      else if (b.state === 'QUEUED') queuedBookings++;
    }

    const alerts: any[] = [];
    if (maintenanceLabs > 0) {
      alerts.push({
        id: 'alert-maint-01',
        title: 'Active Maintenance Work Orders',
        message: `${maintenanceLabs} campus laboratory facility is currently undergoing maintenance.`,
        severity: 'warning',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    return success(
      res,
      {
        totalLabs,
        availableLabs,
        occupiedLabs,
        maintenanceLabs,
        activeBookings,
        queuedBookings,
        totalResources,
        availableResources,
        alerts,
        lastUpdated: new Date().toISOString(),
      },
      'Campus monitoring overview retrieved'
    );
  } catch (err: any) {
    return error(res, 'Failed to compile monitoring overview', [err.message], 500);
  }
});

// GET /api/v1/monitoring/alerts
monitoringRouter.get('/alerts', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  const alerts: any[] = [];
  for (const lab of campusDb.labs.values()) {
    if ((lab as any).operationalStatus === 'maintenance') {
      alerts.push({
        id: `alert-${lab.id}`,
        title: `Lab Under Maintenance: ${lab.name}`,
        message: (lab as any).maintenanceStatus || 'Scheduled servicing and diagnostics in progress.',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
  }
  return success(res, alerts, 'Monitoring alerts retrieved');
});

// PATCH /api/v1/monitoring/alerts/:id/resolve
monitoringRouter.patch('/alerts/:id/resolve', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  return success(res, { id: req.params.id, resolved: true }, 'Alert resolved');
});
