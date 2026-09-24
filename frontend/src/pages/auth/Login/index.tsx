import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles, AlertTriangle } from 'lucide-react';
import { Button, Input, ErrorMessage } from '../../../components/common';
import { useAuth } from '../../../hooks';
import { Role } from '../../../types';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname;
  const isSessionExpired =
    (location.state as any)?.sessionExpired ||
    new URLSearchParams(location.search).get('expired') === 'true';

  // Automatically redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && role && !isSessionExpired) {
      if (from && !from.includes('/login') && !from.includes('/unauthorized')) {
        navigate(from, { replace: true });
      } else if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, role, isSessionExpired, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);

    // Normalize username to campus email format if entered without domain
    const normalizedEmail = emailOrUsername.includes('@')
      ? emailOrUsername.trim().toLowerCase()
      : `${emailOrUsername.trim().toLowerCase()}@campus.edu`;

    try {
      const authenticatedUser = await login({ email: normalizedEmail, password });
      const targetRole = authenticatedUser?.role;

      if (from && !from.includes('/login') && !from.includes('/unauthorized')) {
        navigate(from, { replace: true });
      } else if (targetRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (targetRole === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials. Please verify and retry.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: Role) => {
    const demoEmail = `${role}@campus.edu`;
    const demoPassword = 'password123';
    setEmailOrUsername(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setIsLoading(true);

    try {
      await login({ email: demoEmail, password: demoPassword });
      navigate(`/${role}/dashboard`, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Demo login failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Sign In to Campus Portal</h2>
        <p className="text-xs text-slate-400 mt-1">Access laboratories, book resources, and track status</p>
      </div>

      {isSessionExpired && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2.5 text-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Your session has expired. Please sign in again with your credentials.</span>
        </div>
      )}

      {error && (
        <ErrorMessage
          title="Authentication Failed"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Campus Email / Username"
          type="text"
          placeholder="e.g. student@campus.edu or student"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="username"
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-slate-200 transition-colors focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={isLoading}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      {/* Quick Demo Switcher */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick Demo Access (1-Click)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleQuickDemo('student')}
            disabled={isLoading}
          >
            Student
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleQuickDemo('faculty')}
            disabled={isLoading}
          >
            Faculty
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleQuickDemo('admin')}
            disabled={isLoading}
          >
            Admin
          </Button>
        </div>
      </div>
    </div>
  );
};
