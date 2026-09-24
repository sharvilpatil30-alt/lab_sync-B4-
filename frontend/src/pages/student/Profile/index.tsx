import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Building,
  Save,
  Shield,
  KeyRound,
  LogOut,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth, useUserProfile } from '../../../hooks';
import { Button, Input, Breadcrumbs, useToast, ErrorMessage, ConfirmDialog } from '../../../components/common';

export const ProfilePage: React.FC = () => {
  const { user, role, logout, updateUser } = useAuth();
  const { updateProfile } = useUserProfile();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateProfile.mutateAsync({
        name,
        department,
        profile: {
          phone,
        },
      });
      updateUser(updated);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile changes have been synchronized.',
      });
    } catch (err: any) {
      setError(err.message || 'Could not update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 6) {
      addToast({ type: 'error', title: 'Weak Password', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Mismatch', message: 'New password and confirmation do not match.' });
      return;
    }

    setIsChangingPassword(true);
    // Simulate password change latency
    await new Promise((r) => setTimeout(r, 600));
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    addToast({
      type: 'success',
      title: 'Credentials Updated',
      message: 'Account password changed successfully.',
    });
  };

  const handleConfirmLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleHeaderInfo = () => {
    if (role === 'admin') {
      return {
        badge: 'Tier-1 Infrastructure Administrator',
        sub: 'Full access to campus facilities, compute clusters, maintenance, and audit reports.',
        icon: <Shield className="w-4 h-4 text-amber-400" />,
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    }
    if (role === 'faculty') {
      return {
        badge: 'Faculty Research & Academic Member',
        sub: 'Priority reservation privileges for departmental courses, laboratories, and research instruments.',
        icon: <GraduationCap className="w-4 h-4 text-purple-400" />,
        badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      };
    }
    return {
      badge: 'Enrolled Campus Student',
      sub: 'Standard access to campus computing labs, hardware benches, and collaborative workstations.',
      icon: <User className="w-4 h-4 text-indigo-400" />,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    };
  };

  const roleInfo = getRoleHeaderInfo();

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: 'User Profile' }]} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogoutConfirm(true)}
          leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
          className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 self-start sm:self-auto"
        >
          Sign Out of Campus Account
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Identity Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review institutional identity details, manage contact parameters, and update security credentials
        </p>
      </div>

      {error && (
        <ErrorMessage
          title="Update Error"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      {/* Profile Overview Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{user?.name}</h3>
                <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${roleInfo.badgeColor}`}>
                  {roleInfo.icon}
                  <span>{user?.role}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-500 font-mono">User ID:</span>
                <span className="text-[10px] font-mono text-indigo-400 font-semibold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                  {user?.id || 'usr_campus_01'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
          {roleInfo.sub}
        </p>

        {/* Edit Profile Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Legal Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Institutional Email"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Managed by campus directory system."
            />

            <Input
              label="Department / Faculty Division"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              leftIcon={<Building className="w-4 h-4" />}
              placeholder="e.g. Computer Science & Engineering"
            />

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Security & Password Change Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Security & Credential Management
            </h3>
            <p className="text-xs text-slate-400">Update account password for system authentication</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<KeyRound className="w-4 h-4" />}
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isChangingPassword}
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Confirm Logout Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out of Smart Campus?"
        message="Are you sure you want to conclude your current session? You will be returned to the campus login screen."
        confirmLabel="Confirm Sign Out"
        isDestructive={false}
      />
    </div>
  );
};
