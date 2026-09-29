import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  DoorOpen,
  CalendarCheck,
  User,
  Sliders,
  Grid,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { Role } from '../../types';

interface MobileBottomNavProps {
  onOpenServices?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const { role } = useAuth();

  const getNavItems = (currentRole: Role | null) => {
    switch (currentRole) {
      case 'admin':
        return [
          { label: 'Overview', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Facilities', href: '/admin/labs', icon: <Sliders className="w-5 h-5" /> },
          { label: 'Bookings', href: '/admin/bookings', icon: <CalendarCheck className="w-5 h-5" /> },
          { label: 'Profile', href: '/admin/profile', icon: <User className="w-5 h-5" /> },
        ];
      case 'faculty':
        return [
          { label: 'Dashboard', href: '/faculty/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Labs', href: '/faculty/labs', icon: <DoorOpen className="w-5 h-5" /> },
          { label: 'Bookings', href: '/faculty/bookings', icon: <CalendarCheck className="w-5 h-5" /> },
          { label: 'Profile', href: '/faculty/profile', icon: <User className="w-5 h-5" /> },
        ];
      case 'student':
      default:
        return [
          { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Labs', href: '/student/labs', icon: <DoorOpen className="w-5 h-5" /> },
          { label: 'Bookings', href: '/student/bookings', icon: <CalendarCheck className="w-5 h-5" /> },
          { label: 'Profile', href: '/student/profile', icon: <User className="w-5 h-5" /> },
        ];
    }
  };

  const navItems = getNavItems(role);

  return (
    <nav
      className="app-titlebar titlebar fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-2 py-1 safe-area-pb"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-indigo-600/20 text-indigo-400 scale-105' : ''
                  }`}
                >
                  {item.icon}
                </div>
                <span className="mt-0.5 leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
