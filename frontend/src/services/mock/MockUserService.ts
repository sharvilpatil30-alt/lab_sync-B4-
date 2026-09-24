import { IUserService } from '../types';
import { User, ApiResponse } from '../../types';

export class MockUserService implements IUserService {
  async getProfile(): Promise<ApiResponse<User>> {
    await new Promise((r) => setTimeout(r, 150));
    const stored = localStorage.getItem('smart_campus_auth_user');
    if (!stored) {
      throw new Error('Not authenticated');
    }
    return {
      success: true,
      message: 'Profile retrieved',
      data: JSON.parse(stored),
    };
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    await new Promise((r) => setTimeout(r, 200));
    const stored = localStorage.getItem('smart_campus_auth_user');
    if (!stored) {
      throw new Error('Not authenticated');
    }
    const current: User = JSON.parse(stored);
    const updated: User = {
      ...current,
      ...data,
      profile: {
        ...current.profile,
        ...(data.profile || {}),
      },
    };

    localStorage.setItem('smart_campus_auth_user', JSON.stringify(updated));

    // Also update in users list if present
    const usersJson = localStorage.getItem('smart_campus_mock_users');
    if (usersJson) {
      const users: User[] = JSON.parse(usersJson);
      const idx = users.findIndex((u) => u.id === updated.id);
      if (idx !== -1) {
        users[idx] = updated;
        localStorage.setItem('smart_campus_mock_users', JSON.stringify(users));
      }
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    };
  }
}
