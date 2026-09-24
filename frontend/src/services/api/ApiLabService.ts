import { ILabService } from '../types';
import { Lab, LabFilters, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiLabService implements ILabService {
  async list(filters?: LabFilters): Promise<ApiResponse<Lab[]>> {
    const res = await apiClient.get('/labs', { params: filters });
    return res.data;
  }

  async getById(labId: string): Promise<ApiResponse<Lab>> {
    const res = await apiClient.get(`/labs/${labId}`);
    return res.data;
  }

  async create(data: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Lab>> {
    const res = await apiClient.post('/labs', data);
    return res.data;
  }

  async update(labId: string, data: Partial<Lab>): Promise<ApiResponse<Lab>> {
    const res = await apiClient.patch(`/labs/${labId}`, data);
    return res.data;
  }

  async delete(labId: string): Promise<ApiResponse<{ id: string }>> {
    const res = await apiClient.delete(`/labs/${labId}`);
    return res.data;
  }
}
