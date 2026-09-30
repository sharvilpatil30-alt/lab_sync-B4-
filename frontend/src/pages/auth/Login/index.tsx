import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button, Input, ErrorMessage } from '../../../components/common';
import { useAuth } from '../../../hooks';

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
    const trimmedInput = emailOrUsername.trim().toLowerCase();

    if (!trimmedInput || !password) {
      setError('Please provide both your @ritindia.edu email and password.');
      return;
    }

    // Strict validation: Only accept emails ending with @ritindia.edu
    if (!trimmedInput.endsWith('@ritindia.edu')) {
      setError('Access Denied: Only institutional emails ending with @ritindia.edu are authorized.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@ritindia\.edu$/i;
    if (!emailRegex.test(trimmedInput)) {
      setError('Please provide a valid prefix before @ritindia.edu (e.g. student@ritindia.edu).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const authenticatedUser = await login({ email: trimmedInput, password });
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Institutional Domain Enforcement</span>
        </div>
        <h2 className="text-xl font-bold text-white">Sign In to Campus Portal</h2>
        <p className="text-xs text-slate-400 mt-1">
          Restricted to authorized <strong className="text-indigo-300">@ritindia.edu</strong> accounts
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
        <Input
          label="Institutional Email (@ritindia.edu)"
          type="email"
          placeholder="e.g. anyabandgar458@ritindia.edu or student@ritindia.edu"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          helperText="Only emails ending with @ritindia.edu are accepted"
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

      <div className="pt-2 text-center border-t border-slate-800/80">
        <p className="text-[11px] text-slate-500">
          Rajarambapu Institute of Technology &bull; Campus Portal
        </p>
      </div>
    </div>
  );
};

