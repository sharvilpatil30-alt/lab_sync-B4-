import { IAuthService } from '../types';
import { User, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiAuthService implements IAuthService {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    const res = await apiClient.post('/auth/login', credentials);
    if (res.data?.data?.token) {
      localStorage.setItem('smart_campus_auth_token', res.data.data.token);
      localStorage.setItem('smart_campus_auth_user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  }

  async register(data: { name: string; email: string; password: string; role: string; department?: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    const res = await apiClient.post('/auth/register', data);
    if (res.data?.data?.token) {
      localStorage.setItem('smart_campus_auth_token', res.data.data.token);
      localStorage.setItem('smart_campus_auth_user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('smart_campus_auth_token');
      localStorage.removeItem('smart_campus_auth_user');
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const res = await apiClient.get('/auth/me');
    return res.data;
  }
}
