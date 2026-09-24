import { ApiMonitoringService } from './ApiMonitoringService';
import { Alert, ApiResponse } from '../../types';

export class ApiAlertService {
  private monitoringService = new ApiMonitoringService();

  async listAlerts(): Promise<ApiResponse<Alert[]>> {
    return this.monitoringService.getAlerts();
  }

  async resolveAlert(alertId: string): Promise<ApiResponse<Alert>> {
    return this.monitoringService.resolveAlert(alertId);
  }
}

export const alertsApi = new ApiAlertService();
