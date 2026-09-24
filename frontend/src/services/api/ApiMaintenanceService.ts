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
}
