import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  Building,
} from 'lucide-react';
import { Button, Input, ErrorMessage } from '../../../components/common';
import { useAuth } from '../../../hooks';

export const SignUpPage: React.FC = () => {
  const { register, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && role) {
      navigate(`/${role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    const normalizedEmail = email.includes('@')
      ? email.trim().toLowerCase()
      : `${email.trim().toLowerCase()}@ritindia.edu`;

    setIsLoading(true);

    try {
      await register({
        name: fullName.trim(),
        email: normalizedEmail,
        password,
        department,
      });

      setIsSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Registration could not be completed. Please try again.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* LEFT COLUMN: Academic Info */}
      <div className="lg:col-span-5 space-y-6 text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#2563EB]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Student & Faculty Registration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight mt-3">
            Join the Smart Campus Optimizer
          </h1>
          <p className="text-sm text-[#627D98] mt-2 leading-relaxed">
            Create your account to discover campus lab hardware, check real-time workstation availability, and schedule compute resources.
          </p>
        </div>

        <div className="space-y-3.5 pt-2">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B1F3A]">Direct Seat Reservation</h4>
              <p className="text-[11px] text-[#627D98] mt-0.5">
                Reserve dedicated workstations and computing units with guaranteed slot protection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B1F3A]">Academic Department Alignment</h4>
              <p className="text-[11px] text-[#627D98] mt-0.5">
                Rajarambapu Institute of Technology (RIT) departmental integration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl border border-[#D9E2EC] shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-left border-b border-[#D9E2EC] pb-4">
            <h2 className="text-xl font-bold text-[#0B1F3A] tracking-tight">Create Account</h2>
            <p className="text-xs text-[#627D98] mt-1">Register for RIT academic workspace</p>
          </div>

          {formError && (
            <ErrorMessage
              title="Registration Error"
              message={formError}
              onRetry={() => setFormError(null)}
            />
          )}

          {isSuccess ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1F3A]">Account Created Successfully</h3>
              <p className="text-xs text-[#627D98] leading-relaxed max-w-sm mx-auto">
                Your account has been registered. You can now sign in with your credentials.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <Input
                label="Full Name"
                type="text"
                placeholder="e.g. Sharvil Patil"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<UserIcon className="w-4 h-4" />}
                required
              />

              <Input
                label="Campus Email Address"
                type="email"
                placeholder="e.g. 2553018@ritindia.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
              />

              <Input
                label="Department"
                type="text"
                placeholder="e.g. Computer Science & Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                leftIcon={<Building className="w-4 h-4" />}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-[#0B1F3A] transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="hover:text-[#0B1F3A] transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-11 text-sm font-semibold"
                  isLoading={isLoading}
                  loadingText="Creating Account..."
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Create Account
                </Button>
              </div>
            </form>
          )}

          {/* Sign In Link */}
          <div className="pt-4 border-t border-[#D9E2EC] text-center">
            <p className="text-xs text-[#627D98]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#2563EB] hover:text-[#0B1F3A] hover:underline transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
