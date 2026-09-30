import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle, GraduationCap, BookOpen, Shield } from 'lucide-react';
import { Button, Input, ErrorMessage } from '../../../components/common';
import { useAuth, useTheme } from '../../../hooks';
import { Role } from '../../../types';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, role } = useAuth();
  const { isGoldPink } = useTheme();
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
    <div className="space-y-5">
      <div className="text-center">
        <h2
          className={`text-xl font-bold tracking-tight transition-colors ${
            isGoldPink ? 'text-slate-900' : 'text-white'
          }`}
        >
          Sign In to Campus Portal
        </h2>
        <p
          className={`text-xs mt-1 transition-colors ${
            isGoldPink ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* 1. Campus Email Input */}
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

        {/* 2. Password Input */}
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
              className={`transition-colors focus:outline-none ${
                isGoldPink
                  ? 'text-slate-400 hover:text-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          autoComplete="current-password"
          required
        />

        {/* 3. Minimized Compact Role Selector (Shown AFTER Password) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider ${
                isGoldPink ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              Sign In As Role
            </label>
            <span
              className={`text-[10px] font-medium capitalize ${
                isGoldPink ? 'text-pink-600' : 'text-indigo-400'
              }`}
            >
              Active: {selectedRole}
            </span>
          </div>

          <div
            className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border transition-colors ${
              isGoldPink
                ? 'bg-rose-50/60 border-pink-200/80'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            {[
              { id: 'student' as Role, label: 'Student', icon: GraduationCap },
              { id: 'faculty' as Role, label: 'Faculty', icon: BookOpen },
              { id: 'admin' as Role, label: 'Admin', icon: Shield },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isSelected
                      ? isGoldPink
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-sm shadow-pink-500/30'
                        : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : isGoldPink
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-pink-100/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Submit Button */}
        <Button
          type="submit"
          className={`w-full mt-2 transition-all ${
            isGoldPink
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white shadow-md shadow-pink-500/25 border-transparent'
              : ''
          }`}
          isLoading={isLoading}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Sign In as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
        </Button>
      </form>

      <div
        className={`pt-2 text-center border-t transition-colors ${
          isGoldPink ? 'border-pink-100/90 text-slate-500' : 'border-slate-800/80 text-slate-500'
        }`}
      >
        <p className="text-[11px]">
          Smart Campus Resource Management System
        </p>
      </div>
    </div>
  );
};

