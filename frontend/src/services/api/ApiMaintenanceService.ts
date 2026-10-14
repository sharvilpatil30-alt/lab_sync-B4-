import { IMaintenanceService } from '../types';
import { MaintenanceRecord, MaintenanceFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiMaintenanceService implements IMaintenanceService {
  async list(filters?: MaintenanceFilters): Promise<ApiResponse<MaintenanceRecord[]>> {
    const res = await apiClient.get('/maintenance', { params: filters });
    return res.data;
  }

  async getById(id: string): Promise<ApiResponse<MaintenanceRecord>> {
    const res = await apiClient.get(`/maintenance/${id}`);
    return res.data;
  }

  async create(data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MaintenanceRecord>> {
    const res = await apiClient.post('/maintenance', data);
    return res.data;
  }

  async updateStatus(id: string, status: string): Promise<ApiResponse<MaintenanceRecord>> {
    const res = await apiClient.patch(`/maintenance/${id}`, { status });
    return res.data;
  }

  // Lab Assistant Maintenance Toggle
  async setMaintenance(labId: string, enabled: boolean, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const status = enabled ? 'maintenance' : 'available';
    try {
      // 1. Try dedicated maintenance route
      const res = await apiClient.post(`/labs/${labId}/maintenance`, {
        action: enabled ? 'ENTERED_MAINTENANCE' : 'RELEASED_FROM_MAINTENANCE',
        reason: reason || 'Facility scheduled maintenance',
      });
      return res.data;
    } catch {
      // 2. Try PATCH /labs/:id
      const patchRes = await apiClient.patch(`/labs/${labId}`, {
        operationalStatus: status,
        maintenanceStatus: enabled ? (reason || 'Under Maintenance') : '',
      });
      return {
        success: true,
        message: `Lab status updated to ${status}`,
        data: patchRes.data,
      };
    }
  }
}
