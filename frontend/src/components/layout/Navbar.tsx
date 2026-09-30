import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useNotifications } from '../../hooks';
import { Role } from '../../types';
import { ThemeToggle } from '../common';
import { ServicesLauncher } from './ServicesLauncher';

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

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const location = useLocation();

  // Close menus on route change
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotifMenu(false);
  }, [location.pathname]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    if (showNotifMenu || showUserMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showNotifMenu, showUserMenu]);

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
    setShowUserMenu(false);
    await logout();
    navigate('/login');
  };

  const handleRoleChange = async (newRole: Role) => {
    await switchDemoRole(newRole);
    setShowUserMenu(false);
    navigate(`/${newRole}/dashboard`);
  };

  return (
    <header className="app-titlebar titlebar sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6 max-w-full">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial overflow-hidden mr-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Toggle navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-2 group min-w-0 shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors truncate">
                  SmartCampus
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hidden xs:inline-block shrink-0">
                  Optimizer
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">Lab & Resource Management</p>
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Services Quick Launcher */}
          <ServicesLauncher />

          {/* Theme Switcher Icon */}
          <ThemeToggle />

          {/* Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
              }}
              className="relative p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs sm:hidden"
                  onClick={() => setShowNotifMenu(false)}
                />
                <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-full mt-1.5 w-auto sm:w-96 max-w-sm rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-800 shadow-2xl p-3.5 sm:p-4 z-50 animate-in fade-in slide-in-from-top-2">
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

                <div className="py-2 divide-y divide-slate-800/60 max-h-72 sm:max-h-80 overflow-y-auto space-y-1">
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
                        className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl transition-colors cursor-pointer ${
                          !n.read
                            ? 'bg-indigo-950/30 border border-indigo-500/20 hover:bg-indigo-900/30'
                            : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                            <span className="text-xs font-bold text-slate-200 truncate">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-snug break-words">{n.message}</p>
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
              </>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 sm:pl-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all text-left"
              aria-label="User Profile"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
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
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs sm:hidden"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-full mt-1.5 w-auto sm:w-64 max-w-sm rounded-xl bg-slate-900/98 backdrop-blur-xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

