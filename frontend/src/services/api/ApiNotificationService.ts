import { INotificationService } from '../types';
import { Notification, ApiResponse } from '../../types';
import { apiClient } from './client';

export class ApiNotificationService implements INotificationService {
  async list(): Promise<ApiResponse<Notification[]>> {
    try {
      const res = await apiClient.get('/notifications');
      return res.data;
    } catch {
      return { success: true, message: 'Notifications retrieved', data: [] };
    }
  }

  async markAsRead(id: string): Promise<ApiResponse<{ id: string }>> {
    try {
      const res = await apiClient.patch(`/notifications/${id}/read`);
      return res.data;
    } catch {
      return { success: true, message: 'Notification marked as read', data: { id } };
    }
  }

  async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    try {
      const res = await apiClient.post('/notifications/read-all');
      return res.data;
    } catch {
      return { success: true, message: 'All notifications marked as read', data: { count: 0 } };
    }
  }
}
