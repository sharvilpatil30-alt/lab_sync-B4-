import { IUserService } from '../types';
import { User, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiUserService implements IUserService {
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await apiClient.get('/users/me');
    return res.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const res = await apiClient.patch('/users/me', data);
    return res.data;
  }
}
