import { IAuthService } from '../types';
import { User, ApiResponse, Role } from '../../types';
import { usersData } from '../../data/mock';

const USERS_KEY = 'smart_campus_rit_users_v2';
const CURRENT_USER_KEY = 'smart_campus_auth_user';

function getStoredUsers(): User[] {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].email?.endsWith('@ritindia.edu')) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(usersData));
  return usersData as User[];
}

export class MockAuthService implements IAuthService {
  async login(credentials: { email: string; password: string; role?: Role }): Promise<ApiResponse<{ token: string; user: User }>> {
    await new Promise((r) => setTimeout(r, 250));

    const trimmedEmail = credentials.email.trim().toLowerCase();

    // Strict validation: must end with @ritindia.edu
    if (!trimmedEmail.endsWith('@ritindia.edu')) {
      throw {
        response: {
          data: {
            success: false,
            message: 'Access restricted: Only institutional emails ending with @ritindia.edu are authorized.',
          },
        },
      };
    }

    const users = getStoredUsers();
    let user = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    const targetRole: Role = credentials.role || (
      trimmedEmail.includes('admin')
        ? 'admin'
        : trimmedEmail.includes('faculty') || trimmedEmail.includes('prof')
        ? 'faculty'
        : 'student'
    );

    // If user is not yet seeded, dynamically provision for any valid @ritindia.edu account
    if (!user) {
      const prefix = trimmedEmail.split('@')[0];
      const capitalizedName = prefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      user = {
        id: `usr_${Date.now()}`,
        name: capitalizedName || 'RIT Member',
        email: trimmedEmail,
        role: targetRole,
        department: 'Computer Science & Engineering',
        profile: {
          phone: '+91 98765 43210',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else if (credentials.role && user.role !== credentials.role) {
      // Apply the user's selected role
      user = { ...user, role: credentials.role };
      const idx = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);
      if (idx !== -1) {
        users[idx] = user;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
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

    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail.endsWith('@ritindia.edu')) {
      throw {
        response: {
          data: {
            success: false,
            message: 'Registration restricted: Only institutional emails ending with @ritindia.edu are accepted.',
          },
        },
      };
    }

    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      throw {
        response: {
          data: {
            success: false,
            message: 'User with this @ritindia.edu email already exists',
          },
        },
      };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: trimmedEmail,
      role: data.role as any,
      department: data.department || 'Computer Science & Engineering',
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
