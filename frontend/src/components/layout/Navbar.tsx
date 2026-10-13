import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth, useNotifications } from '../../hooks';
import { Button } from '../common';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { data: notifications = [], markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

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

  // Canonical role label mapping: display 'Lab Assistant' for administrative role
  const displayRoleLabel =
    role === 'admin' ? 'Lab Assistant' : role === 'faculty' ? 'Faculty' : 'Student';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D9E2EC] bg-white/95 backdrop-blur-md shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & Official RIT Logo Branding */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && isAuthenticated && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8] transition-colors"
              aria-label="Toggle navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 group">
            {/* Official RIT Logo Asset */}
            <div className="h-10 flex items-center justify-center shrink-0">
              <img
                src="/RIT.png"
                alt="RIT Logo"
                className="h-9 w-auto object-contain rounded-md shadow-2xs"
                onError={(e) => {
                  // Fallback to relative asset if needed
                  const target = e.currentTarget;
                  if (!target.src.includes('assets')) {
                    target.src = '/src/assets/RIT.png';
                  }
                }}
              />
            </div>
            <div className="border-l border-[#D9E2EC] pl-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-[#0B1F3A] leading-tight">
                  Rajarambapu Institute of Technology
                </span>
              </div>
              <p className="text-[10px] text-[#627D98] font-medium leading-tight hidden sm:block">
                Smart Campus Lab & Resource Optimizer
              </p>
            </div>
          </Link>

          {/* Desktop Dynamic Page Title */}
          {pageTitle && (
            <div className="hidden xl:flex items-center gap-2 pl-4 ml-2 border-l border-[#D9E2EC]">
              <span className="text-xs font-semibold text-[#163A63] tracking-tight">{pageTitle}</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Authenticated Profile / Guest CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Sign Up
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Notifications Popover */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifMenu(!showNotifMenu);
                    setShowUserMenu(false);
                  }}
                  className="relative p-2 rounded-lg text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8] transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#D9E2EC] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-[#102A43]">
                    <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">System Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold border border-[#BFDBFE]">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead.mutate()}
                          className="text-[11px] text-[#2563EB] hover:text-[#163A63] font-medium transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="py-2 divide-y divide-[#D9E2EC] max-h-80 overflow-y-auto space-y-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#627D98] text-center py-6">No recent notifications</p>
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
                                ? 'bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                                : 'hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
                                <span className="text-xs font-bold text-[#0B1F3A]">{n.title}</span>
                              </div>
                              <span className="text-[10px] text-[#627D98] font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-[#627D98] mt-1 leading-snug">{n.message}</p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#163A63] border border-[#D9E2EC]">
                                {n.type || 'info'}
                              </span>
                              {!n.read && (
                                <span className="text-[10px] text-[#2563EB] hover:underline">Mark read</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Menu with Verified Role */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifMenu(false);
                  }}
                  className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl border border-[#D9E2EC] bg-white hover:bg-[#F8FAFC] transition-all text-left shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#F0F4F8] border border-[#D9E2EC] flex items-center justify-center">
                    {user?.profile?.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-[#627D98]" />
                    )}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-semibold text-[#0B1F3A] leading-tight">{user?.name || 'Campus User'}</p>
                    <p className="text-[10px] text-[#627D98]">{displayRoleLabel}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#627D98] hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#D9E2EC] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-[#102A43]">
                    <div className="px-3 py-2 border-b border-[#D9E2EC]">
                      <p className="text-xs font-bold text-[#0B1F3A]">{user?.name}</p>
                      <p className="text-[11px] text-[#627D98] truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                        Role: {displayRoleLabel}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to={`/${role || 'student'}/profile`}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-[#163A63] hover:text-[#0B1F3A] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-[#627D98]" />
                        <span>My Profile</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-rose-50 rounded-lg transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
