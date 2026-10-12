import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertTriangle,
  ShieldCheck,
  CalendarCheck,
  Cpu,
  Building,
} from 'lucide-react';
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
    if (!emailOrUsername.trim() || !password) {
      setError('Please provide both email/username and password.');
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
      : `${emailOrUsername.trim().toLowerCase()}@ritindia.edu`;

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
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Invalid credentials. Please verify your email and password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* LEFT COLUMN: Academic Branding & Info */}
      <div className="lg:col-span-5 space-y-6 text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#2563EB]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Portal Sign In</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight mt-3">
            Smart Campus Resource Management
          </h1>
          <p className="text-sm text-[#627D98] mt-2 leading-relaxed">
            Sign in to access your laboratory schedules, reserve high-performance compute benches, and review booking telemetry.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B1F3A]">Resource Scheduling</h4>
              <p className="text-[11px] text-[#627D98] mt-0.5">
                Book workstations and check real-time availability.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B1F3A]">Compute Infrastructure</h4>
              <p className="text-[11px] text-[#627D98] mt-0.5">
                Access specialized GPU nodes and engineering testbeds.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B1F3A]">Campus Directory</h4>
              <p className="text-[11px] text-[#627D98] mt-0.5">
                Integrated indoor wayfinding and hardware inventory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sign In Card */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl border border-[#D9E2EC] shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-left border-b border-[#D9E2EC] pb-4">
            <h2 className="text-xl font-bold text-[#0B1F3A] tracking-tight">Welcome Back</h2>
            <p className="text-xs text-[#627D98] mt-1">Sign in with your RIT academic credentials</p>
          </div>

          {isSessionExpired && (
            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
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

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              label="Campus Email or Username"
              type="text"
              placeholder="e.g. 2553018@ritindia.edu or student"
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
                  className="hover:text-[#0B1F3A] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold"
                isLoading={isLoading}
                loadingText="Signing In..."
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="pt-4 border-t border-[#D9E2EC] text-center">
            <p className="text-xs text-[#627D98]">
              Don&apos;t have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-[#2563EB] hover:text-[#0B1F3A] hover:underline transition-colors"
              >
                Create an account / Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
