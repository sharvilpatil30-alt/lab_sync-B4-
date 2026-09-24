import { INotificationService } from '../types';
import { Notification, ApiResponse } from '../../types';
import { notificationsData } from '../../data/mock';

const notificationsList: Notification[] = [...(notificationsData as unknown as Notification[])];

export class MockNotificationService implements INotificationService {
  async list(): Promise<ApiResponse<Notification[]>> {
    await new Promise((r) => setTimeout(r, 150));
    return {
      success: true,
      message: 'Notifications retrieved',
      data: notificationsList,
    };
  }

  async markAsRead(id: string): Promise<ApiResponse<{ id: string }>> {
    await new Promise((r) => setTimeout(r, 100));
    const item = notificationsList.find((n) => n.id === id);
    if (item) {
      item.read = true;
    }
    return {
      success: true,
      message: 'Notification marked as read',
      data: { id },
    };
  }

  async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    await new Promise((r) => setTimeout(r, 150));
    let count = 0;
    notificationsList.forEach((n) => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
    return {
      success: true,
      message: 'All notifications marked as read',
      data: { count },
    };
  }
}
