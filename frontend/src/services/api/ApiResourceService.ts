import { IResourceService } from '../types';
import { Resource, ResourceFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiResourceService implements IResourceService {
  async list(filters?: ResourceFilters): Promise<ApiResponse<Resource[]>> {
    const res = await apiClient.get('/resources', { params: filters });
    return res.data;
  }

  async getById(resourceId: string): Promise<ApiResponse<Resource>> {
    const res = await apiClient.get(`/resources/${resourceId}`);
    return res.data;
  }

  async create(data: Omit<Resource, 'id' | 'createdAt'>): Promise<ApiResponse<Resource>> {
    const res = await apiClient.post('/resources', data);
    return res.data;
  }

  async update(resourceId: string, data: Partial<Resource>): Promise<ApiResponse<Resource>> {
    const res = await apiClient.patch(`/resources/${resourceId}`, data);
    return res.data;
  }

  async updateStatus(resourceId: string, operationalStatus: string, maintenanceStatus?: string): Promise<ApiResponse<Resource>> {
    const res = await apiClient.patch(`/resources/${resourceId}`, {
      operationalStatus,
      maintenanceStatus,
      availability: operationalStatus === 'available',
    });
    return res.data;
  }

  async delete(resourceId: string): Promise<ApiResponse<{ id: string }>> {
    const res = await apiClient.delete(`/resources/${resourceId}`);
    return res.data;
  }
}
