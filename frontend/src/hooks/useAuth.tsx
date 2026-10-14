import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, Role } from '../types';
import { authService } from '../services';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeRole } from '../services/api/ApiAuthService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { name: string; email: string; password: string; department?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state and restore session
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const session = isSupabaseConfigured && supabase
          ? (await supabase.auth.getSession()).data.session : null;
        const activeToken = session?.access_token || (!isSupabaseConfigured ? localStorage.getItem('smart_campus_auth_token') : null);
        if (!activeToken) {
          localStorage.removeItem('smart_campus_auth_token');
          localStorage.removeItem('smart_campus_auth_user');
          return;
        }
        localStorage.setItem('smart_campus_auth_token', activeToken);
        const response = await authService.getCurrentUser();
        const profile = response.data;
        const activeUser = { ...profile, role: normalizeRole(profile.role) };
        if (isMounted) {
          setToken(activeToken);
          setUser(activeUser);
          localStorage.setItem('smart_campus_auth_user', JSON.stringify(activeUser));
        }
      } catch {
        if (isMounted) { setUser(null); setToken(null); }
        localStorage.removeItem('smart_campus_auth_token');
        localStorage.removeItem('smart_campus_auth_user');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    // Listen for Supabase auth state changes if configured
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT' || !session) {
          queryClient.clear();
          setUser(null);
          setToken(null);
          localStorage.removeItem('smart_campus_auth_token');
          localStorage.removeItem('smart_campus_auth_user');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setToken(session.access_token);
          localStorage.setItem('smart_campus_auth_token', session.access_token);
        }
      });
      authListener = data;
    }

    const handleExpired = () => {
      if (!isMounted) return;
      setUser(null);
      setToken(null);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    };

    window.addEventListener('auth:session-expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:session-expired', handleExpired);
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      const authenticatedUser = res.data?.user || (res as any).user;
      const authToken = res.data?.token || (res as any).token;
      queryClient.clear();
      setUser(authenticatedUser);
      setToken(authToken);
      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; department?: string }): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await authService.register({
          name: data.name,
          email: data.email,
          password: data.password,
          department: data.department,
        });
        const registeredUser = res.data?.user || (res as any).user;
        const authToken = res.data?.token || (res as any).token;
        setUser(registeredUser);
        if (authToken) {
          setToken(authToken);
        }
        return registeredUser;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem('smart_campus_auth_user', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
