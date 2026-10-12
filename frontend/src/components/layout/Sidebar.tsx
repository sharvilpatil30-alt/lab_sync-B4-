import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  User,
  Sliders,
  Cpu,
  Wrench,
  BookOpenCheck,
  Activity,
  BarChart3,
  X,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { Role } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const getNavItems = (currentRole: Role | null): NavItem[] => {
    switch (currentRole) {
      case 'student':
        return [
          { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Search Labs', href: '/student/labs', icon: <Search className="w-4 h-4" /> },
          { label: 'Campus Route', href: '/student/route', icon: <Compass className="w-4 h-4" /> },
          { label: 'My Bookings', href: '/student/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
          { label: 'Profile', href: '/student/profile', icon: <User className="w-4 h-4" /> },
        ];
      case 'faculty':
        return [
          { label: 'Dashboard', href: '/faculty/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Search Labs', href: '/faculty/labs', icon: <Search className="w-4 h-4" /> },
          { label: 'Campus Route', href: '/faculty/route', icon: <Compass className="w-4 h-4" /> },
          { label: 'My Bookings', href: '/faculty/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
          { label: 'Profile', href: '/faculty/profile', icon: <User className="w-4 h-4" /> },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Lab Management', href: '/admin/labs', icon: <Sliders className="w-4 h-4" /> },
          { label: 'Campus Route', href: '/admin/route', icon: <Compass className="w-4 h-4" /> },
          { label: 'Resource Inventory', href: '/admin/resources', icon: <Cpu className="w-4 h-4" /> },
          { label: 'Maintenance Schedule', href: '/admin/maintenance', icon: <Wrench className="w-4 h-4" /> },
          { label: 'All Bookings', href: '/admin/bookings', icon: <BookOpenCheck className="w-4 h-4" /> },
          { label: 'Live Monitoring', href: '/admin/monitoring', icon: <Activity className="w-4 h-4" /> },
          { label: 'Reports & Analytics', href: '/admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
          { label: 'Profile', href: '/admin/profile', icon: <User className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1F3A]/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#D9E2EC] bg-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-4rem)]`}
      >
        {/* Mobile Header with Close button */}
        <div className="flex items-center justify-between p-4 border-b border-[#D9E2EC] lg:hidden">
          <span className="font-bold text-sm text-[#0B1F3A]">Navigation</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#829AB1]">
            {role === 'admin' ? 'Lab Assistant Portal' : role ? `${role} Portal` : 'Portal'}
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#0B1F3A] border-l-3 border-[#2563EB] font-semibold shadow-xs'
                    : 'text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F8FAFC]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#2563EB]' : 'text-[#627D98]'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info badge */}
        <div className="p-3 border-t border-[#D9E2EC]">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D9E2EC] text-[11px] text-[#627D98]">
            <p className="font-semibold text-[#0B1F3A]">Smart Campus Platform</p>
            <p className="text-[10px] text-[#829AB1] mt-0.5">Academic Resource Management</p>
          </div>
        </div>
      </aside>
    </>
  );
};
