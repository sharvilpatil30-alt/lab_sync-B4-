import { IAuthService } from '../types';
import { User, ApiResponse, Role } from '../../types';
import { apiClient } from './client';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Helper to map DB/Supabase roles to canonical frontend roles
export function normalizeRole(rawRole?: string): Role {
  if (!rawRole) return 'student';
  const lower = rawRole.toLowerCase();
  if (lower === 'admin' || lower === 'lab_admin' || lower === 'lab assistant') return 'admin';
  if (lower === 'faculty') return 'faculty';
  return 'student';
}

export class ApiAuthService implements IAuthService {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    // 1. If Supabase Auth is configured, use Supabase client
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error || !data.session || !data.user) {
        throw new Error(error?.message || 'Invalid email or password.');
      }

      const token = data.session.access_token;
      localStorage.setItem('smart_campus_auth_token', token);

      // Verify identity and role through backend GET /api/v1/auth/me
      let verifiedUser: User;
      try {
        const meRes = await this.getCurrentUser();
        const meData = (meRes as any).data || meRes;
        verifiedUser = {
          id: meData.userId || meData.id || data.user.id,
          name: meData.fullName || meData.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Campus User',
          email: meData.email || data.user.email || credentials.email,
          role: normalizeRole(meData.role || data.user.app_metadata?.role),
          department: meData.department || 'Computer Science & Engineering',
        };
      } catch {
        // Fallback to Supabase metadata if backend /auth/me is pending
        verifiedUser = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Campus User',
          email: data.user.email || credentials.email,
          role: normalizeRole(data.user.app_metadata?.role),
          department: data.user.user_metadata?.department || 'Computer Science & Engineering',
        };
      }

      localStorage.setItem('smart_campus_auth_user', JSON.stringify(verifiedUser));

      return {
        success: true,
        message: 'Signed in successfully via Supabase Auth',
        data: { token, user: verifiedUser },
      };
    }

    // 2. Fallback to backend /api/v1/auth/login if Supabase is not configured locally
    const res = await apiClient.post('/auth/login', credentials);
    const payload = res.data?.data || res.data;
    if (payload?.token) {
      localStorage.setItem('smart_campus_auth_token', payload.token);
      if (payload.user) {
        payload.user.role = normalizeRole(payload.user.role);
        localStorage.setItem('smart_campus_auth_user', JSON.stringify(payload.user));
      }
    }
    return res.data;
  }

  async register(data: { name: string; email: string; password: string; role?: string; department?: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    const studentRole: Role = 'student'; // Security: users cannot self-assign Admin or Lab Assistant

    if (isSupabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            role: studentRole,
            department: data.department || 'Computer Science & Engineering',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const token = authData.session?.access_token || '';
      if (token) {
        localStorage.setItem('smart_campus_auth_token', token);
      }

      const registeredUser: User = {
        id: authData.user?.id || '',
        name: data.name,
        email: data.email,
        role: studentRole,
        department: data.department || 'Computer Science & Engineering',
      };

      if (token) {
        localStorage.setItem('smart_campus_auth_user', JSON.stringify(registeredUser));
      }

      return {
        success: true,
        message: authData.session
          ? 'Registration successful'
          : 'Registration initiated. Please verify your email to continue.',
        data: { token, user: registeredUser },
      };
    }

    // Fallback to backend /api/v1/auth/register
    const res = await apiClient.post('/auth/register', {
      ...data,
      role: studentRole,
    });
    const payload = res.data?.data || res.data;
    if (payload?.token) {
      localStorage.setItem('smart_campus_auth_token', payload.token);
      if (payload.user) {
        payload.user.role = normalizeRole(payload.user.role);
        localStorage.setItem('smart_campus_auth_user', JSON.stringify(payload.user));
      }
    }
    return res.data;
  }

  async logout(): Promise<void> {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        await apiClient.post('/auth/logout');
      }
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
