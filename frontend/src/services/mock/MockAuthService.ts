import { IAuthService } from '../types';
import { User, ApiResponse } from '../../types';
import { usersData } from '../../data/mock';

const USERS_KEY = 'smart_campus_mock_users';
const CURRENT_USER_KEY = 'smart_campus_auth_user';

function getStoredUsers(): User[] {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(usersData));
  return usersData as User[];
}

export class MockAuthService implements IAuthService {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    await new Promise((r) => setTimeout(r, 250));
    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === credentials.email.toLowerCase());

    if (!user) {
      throw {
        response: {
          data: {
            success: false,
            message: 'Invalid email or password',
          },
        },
      };
    }

    const token = `mock_jwt_token_${user.id}_${Date.now()}`;
    localStorage.setItem('smart_campus_auth_token', token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    return {
      success: true,
      message: 'Login successful',
      data: { token, user },
    };
  }

  async register(data: { name: string; email: string; password: string; role: string; department?: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    await new Promise((r) => setTimeout(r, 300));
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw {
        response: {
          data: {
            success: false,
            message: 'User with this email already exists',
          },
        },
      };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role as any,
      department: data.department || 'General Academic',
      profile: {
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      },
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const token = `mock_jwt_token_${newUser.id}_${Date.now()}`;
    localStorage.setItem('smart_campus_auth_token', token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    return {
      success: true,
      message: 'Account registered successfully',
      data: { token, user: newUser },
    };
  }

  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    localStorage.removeItem('smart_campus_auth_token');
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await new Promise((r) => setTimeout(r, 100));
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) {
      throw {
        response: {
          status: 401,
          data: { success: false, message: 'Unauthenticated' },
        },
      };
    }
    return {
      success: true,
      message: 'User profile retrieved',
      data: JSON.parse(stored),
    };
  }
}
