import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle, GraduationCap, BookOpen, Shield } from 'lucide-react';
import { Button, Input, ErrorMessage } from '../../../components/common';
import { useAuth } from '../../../hooks';
import { Role } from '../../../types';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState<Role>('student');
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
    const trimmedInput = emailOrUsername.trim().toLowerCase();

    if (!trimmedInput || !password) {
      setError('Please provide both your email and password.');
      return;
    }

    // Strict validation: Only accept emails ending with @ritindia.edu
    if (!trimmedInput.endsWith('@ritindia.edu')) {
      setError('Access Denied: Only institutional emails ending with @ritindia.edu are authorized.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@ritindia\.edu$/i;
    if (!emailRegex.test(trimmedInput)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const authenticatedUser = await login({
        email: trimmedInput,
        password,
        role: selectedRole,
      });
      const targetRole = selectedRole || authenticatedUser?.role;

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Sign In to Campus Portal</h2>
        <p className="text-xs text-slate-400 mt-1">
          Access laboratories, book resources, and track status
        </p>
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
        {/* Role Selection (Select 1 among 3) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'student' as Role,
                label: 'Student',
                desc: 'Workstations',
                icon: GraduationCap,
              },
              {
                id: 'faculty' as Role,
                label: 'Faculty',
                desc: 'Lab Sessions',
                icon: BookOpen,
              },
              {
                id: 'admin' as Role,
                label: 'Admin',
                desc: 'Management',
                icon: Shield,
              },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {r.label}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {r.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Campus Email"
          type="email"
          placeholder="e.g. anyabandgar458@ritindia.edu"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
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
          Sign In as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
        </Button>
      </form>

      <div className="pt-2 text-center border-t border-slate-800/80">
        <p className="text-[11px] text-slate-500">
          Smart Campus Resource Management System
        </p>
      </div>
    </div>
  );
};

