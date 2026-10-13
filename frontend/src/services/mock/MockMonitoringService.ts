import { IMonitoringService } from '../types';
import { MonitoringOverview, Alert, ApiResponse, SystemHealthData } from '../../types';
import { labsData, resourcesData, bookingsData } from '../../data/mock';

const activeAlerts: Alert[] = [
  {
    id: 'alt_01',
    severity: 'medium',
    message: 'High network throughput detected on Alan Turing Hall Gateway.',
    relatedEntityType: 'lab',
    relatedEntityId: 'lab_cse_01',
    resolved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'alt_02',
    severity: 'high',
    message: 'Cryogenic compressor sensor ping timeout in Niels Bohr Sub-level.',
    relatedEntityType: 'resource',
    relatedEntityId: 'res_cryo_01',
    resolved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'alt_03',
    severity: 'low',
    message: 'Scheduled maintenance planned for additive manufacturing fab tomorrow.',
    relatedEntityType: 'lab',
    relatedEntityId: 'lab_fab_06',
    resolved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

export class MockMonitoringService implements IMonitoringService {
  async getOverview(): Promise<ApiResponse<MonitoringOverview>> {
    await new Promise((r) => setTimeout(r, 200));

    const storedLabs = localStorage.getItem('smart_campus_mock_labs');
    const labs = storedLabs ? JSON.parse(storedLabs) : labsData;

    const storedResources = localStorage.getItem('smart_campus_mock_resources');
    const resources = storedResources ? JSON.parse(storedResources) : resourcesData;

    const storedBookings = localStorage.getItem('smart_campus_mock_bookings');
    const bookings = storedBookings ? JSON.parse(storedBookings) : bookingsData;

    const availableLabs = labs.filter((l: any) => l.operationalStatus === 'available').length;
    const occupiedLabs = labs.filter((l: any) => l.operationalStatus === 'occupied').length;
    const maintenanceLabs = labs.filter((l: any) => l.operationalStatus === 'maintenance').length;

    const activeBookings = bookings.filter((b: any) => b.status === 'ACTIVE').length;
    const queuedBookings = bookings.filter((b: any) => b.status === 'QUEUED').length;

    const availableResources = resources.filter((r: any) => r.availability).length;

    const overview: MonitoringOverview = {
      totalLabs: labs.length,
      availableLabs,
      occupiedLabs,
      maintenanceLabs,
      activeBookings,
      queuedBookings,
      totalResources: resources.length,
      availableResources,
      alerts: activeAlerts.filter((a) => !a.resolved),
      lastUpdated: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Monitoring overview retrieved',
      data: overview,
    };
  }

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    await new Promise((r) => setTimeout(r, 150));
    return {
      success: true,
      message: 'Alerts retrieved',
      data: activeAlerts,
    };
  }

  async resolveAlert(alertId: string): Promise<ApiResponse<Alert>> {
    await new Promise((r) => setTimeout(r, 150));
    const alert = activeAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
    return {
      success: true,
      message: 'Alert marked as resolved',
      data: alert || ({} as Alert),
    };
  }

  async checkHealth(): Promise<ApiResponse<SystemHealthData>> {
    await new Promise((r) => setTimeout(r, 35));
    return {
      success: true,
      message: 'Smart Campus Lab & Resource Optimizer Mock Environment is healthy',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'mock-browser-runtime',
        version: '1.0.0-mock',
        latencyMs: 12,
      },
    };
  }
}
