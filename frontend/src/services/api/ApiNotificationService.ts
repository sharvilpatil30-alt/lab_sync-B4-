import { INotificationService } from '../types';
import { Notification, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiNotificationService implements INotificationService {
  async list(): Promise<ApiResponse<Notification[]>> {
    const res = await apiClient.get('/notifications');
    return res.data;
  }

  async markAsRead(id: string): Promise<ApiResponse<{ id: string }>> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  }

  async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    const res = await apiClient.post('/notifications/read-all');
    return res.data;
  }
}
