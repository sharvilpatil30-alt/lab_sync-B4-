import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Database,
  Menu,
  X,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useNotifications } from '../../hooks';
import { getActiveDataMode, setActiveDataMode } from '../../services';
import { Role } from '../../types';
import { SystemHealthIndicator } from '../common';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, role, logout, switchDemoRole } = useAuth();
  const { data: notifications = [], markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const activeMode = getActiveDataMode();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname.includes('/dashboard')) return 'Dashboard Overview';
    if (pathname.includes('/labs/')) return 'Facility Details & Hardware';
    if (pathname.includes('/labs')) return role === 'admin' ? 'Laboratory Facility Directory' : 'Facility Discovery & Availability';
    if (pathname.includes('/bookings/create')) return 'Reserve Workstation';
    if (pathname.includes('/bookings/')) return 'Reservation Details & Queue Tracker';
    if (pathname.includes('/bookings')) return role === 'admin' ? 'Campus Bookings Registry' : 'My Scheduled Reservations';
    if (pathname.includes('/resources/create')) return 'Register New Hardware';
    if (pathname.includes('/resources/')) return 'Hardware Specifications & Status';
    if (pathname.includes('/resources')) return 'Hardware Resource Inventory';
    if (pathname.includes('/maintenance')) return 'Preventative Maintenance Console';
    if (pathname.includes('/monitoring')) return 'Live Operational Telemetry';
    if (pathname.includes('/reports')) return 'Campus Utilization & Analytics';
    if (pathname.includes('/route')) return 'Campus Wayfinding Navigation';
    if (pathname.includes('/profile')) return 'Account & Identity Profile';
    return '';
  };

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleMode = () => {
    const nextMode = activeMode === 'mock' ? 'api' : 'mock';
    setActiveDataMode(nextMode);
  };

  const handleRoleChange = async (newRole: Role) => {
    await switchDemoRole(newRole);
    setShowUserMenu(false);
    navigate(`/${newRole}/dashboard`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  SmartCampus
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Optimizer
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Lab & Resource Management</p>
            </div>
          </Link>

          {/* Desktop Dynamic Page Title */}
          {pageTitle && (
            <div className="hidden xl:flex items-center gap-2 pl-4 ml-2 border-l border-slate-800">
              <span className="text-xs font-semibold text-slate-300 tracking-tight">{pageTitle}</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Backend API Health Status */}
          <SystemHealthIndicator />

          {/* Data Mode Switcher Badge */}
          <button
            onClick={handleToggleMode}
            title={`Click to switch to ${activeMode === 'mock' ? 'Real API' : 'Mock'} mode`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              activeMode === 'mock'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="uppercase text-[11px] font-semibold">{activeMode} MODE</span>
          </button>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-88 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">System Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="py-2 divide-y divide-slate-800/60 max-h-80 overflow-y-auto space-y-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No recent notifications</p>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.read) {
                            markAsRead.mutate(n.id);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl transition-colors cursor-pointer ${
                          !n.read
                            ? 'bg-indigo-950/30 border border-indigo-500/20 hover:bg-indigo-900/30'
                            : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                            <span className="text-xs font-bold text-slate-200">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-snug">{n.message}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {n.type || 'info'}
                          </span>
                          {!n.read && (
                            <span className="text-[10px] text-indigo-400 hover:underline">Mark read</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                {user?.profile?.avatarUrl ? (
                  <img src={user.profile.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user?.name || 'Guest'}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role || 'User'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-200">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Role: {role}
                  </span>
                </div>

                {/* Quick Role Switcher for Pairing & Demo */}
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" /> Switch Demo Role
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {(['student', 'faculty', 'admin'] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`text-xs capitalize py-1 rounded border transition-colors ${
                          role === r
                            ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to={`/${role || 'student'}/profile`}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
