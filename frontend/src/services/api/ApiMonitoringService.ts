import { IMonitoringService } from '../types';
import { MonitoringOverview, Alert, ApiResponse, SystemHealthData } from '../../types';
import { apiClient } from './client';

export class ApiMonitoringService implements IMonitoringService {
  async getOverview(): Promise<ApiResponse<MonitoringOverview>> {
    const res = await apiClient.get('/monitoring/overview');
    return res.data;
  }

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    const res = await apiClient.get('/monitoring/alerts');
    return res.data;
  }

  async resolveAlert(alertId: string): Promise<ApiResponse<Alert>> {
    const res = await apiClient.patch(`/monitoring/alerts/${alertId}/resolve`);
    return res.data;
  }

  async checkHealth(): Promise<ApiResponse<SystemHealthData>> {
    const startTime = performance.now();
    const res = await apiClient.get('/health');
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      success: res.data?.success ?? true,
      message: res.data?.message ?? 'Health check OK',
      data: {
        status: res.data?.data?.status ?? 'ok',
        timestamp: res.data?.data?.timestamp ?? new Date().toISOString(),
        environment: res.data?.data?.environment ?? 'development',
        version: '1.0.0',
        latencyMs,
      },
    };
  }
}

