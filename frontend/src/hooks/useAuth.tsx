import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state and restore session
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        // 1. If Supabase is active, check active Supabase session
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            const activeToken = data.session.access_token;
            let activeUser: User;
            try {
              const meRes = await authService.getCurrentUser();
              const meData = (meRes as any).data || meRes;
              activeUser = {
                id: meData.userId || meData.id || data.session.user.id,
                name: meData.fullName || meData.name || data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'Campus User',
                email: meData.email || data.session.user.email || '',
                role: normalizeRole(meData.role || data.session.user.user_metadata?.role),
                department: meData.department || 'Computer Science & Engineering',
              };
            } catch {
              activeUser = {
                id: data.session.user.id,
                name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'Campus User',
                email: data.session.user.email || '',
                role: normalizeRole(data.session.user.user_metadata?.role),
                department: data.session.user.user_metadata?.department || 'Computer Science & Engineering',
              };
            }

            if (isMounted) {
              setToken(activeToken);
              setUser(activeUser);
              localStorage.setItem('smart_campus_auth_token', activeToken);
              localStorage.setItem('smart_campus_auth_user', JSON.stringify(activeUser));
            }
            setIsLoading(false);
            return;
          }
        }

        // 2. Fallback to localStorage session
        const storedToken = localStorage.getItem('smart_campus_auth_token');
        const storedUser = localStorage.getItem('smart_campus_auth_user');

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.role = normalizeRole(parsedUser.role);
            if (isMounted) {
              setToken(storedToken);
              setUser(parsedUser);
            }
          } catch {
            localStorage.removeItem('smart_campus_auth_user');
            localStorage.removeItem('smart_campus_auth_token');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    // Listen for Supabase auth state changes if configured
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT' || !session) {
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
