import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { authService, getActiveDataMode } from '../services';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { name: string; email: string; password: string; role: string; department?: string }) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smart_campus_auth_token');
      const storedUser = localStorage.getItem('smart_campus_auth_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('smart_campus_auth_user');
          localStorage.removeItem('smart_campus_auth_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleExpired = () => {
      setUser(null);
      setToken(null);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    };

    window.addEventListener('auth:session-expired', handleExpired);
    return () => window.removeEventListener('auth:session-expired', handleExpired);
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      setUser(res.data.user);
      setToken(res.data.token);
      return res.data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; role: string; department?: string }): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await authService.register(data);
        setUser(res.data.user);
        setToken(res.data.token);
        return res.data.user;
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

  // Quick switcher between demo roles for convenience
  const switchDemoRole = useCallback(async (newRole: Role) => {
    setIsLoading(true);
    try {
      const email = `${newRole}@campus.edu`;
      const res = await authService.login({ email, password: 'password123' });
      setUser(res.data.user);
      setToken(res.data.token);
    } catch {
      // If user not found, manually update active user role
      if (user) {
        const updated: User = { ...user, role: newRole };
        setUser(updated);
        localStorage.setItem('smart_campus_auth_user', JSON.stringify(updated));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        switchDemoRole,
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
