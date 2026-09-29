import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  DoorOpen,
  Cpu,
  CalendarPlus,
  Compass,
  Activity,
  Wrench,
  BarChart3,
  CalendarCheck,
  ShieldCheck,
  Search,
  Sparkles,
  ChevronRight,
  X,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { DeadStockInventoryModal } from '../inventory/DeadStockInventoryModal';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  roles: ('student' | 'faculty' | 'admin')[];
  badge?: string;
  category: 'core' | 'hardware' | 'analytics' | 'navigation';
  isCustomAction?: boolean;
}

export const ServicesLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const { role } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);

  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const services: ServiceItem[] = [
    {
      id: 'labs',
      name: 'Lab Occupancy Grid',
      description: 'Real-time seat telemetry, live workstation availability & sensors',
      icon: <DoorOpen className="w-5 h-5 text-indigo-400" />,
      route: `${basePrefix}/labs`,
      roles: ['student', 'faculty', 'admin'],
      badge: 'Live',
      category: 'core',
    },
    {
      id: 'book',
      name: 'Reserve Workstation',
      description: 'Quick booking form with priority scoring & conflict resolution',
      icon: <CalendarPlus className="w-5 h-5 text-emerald-400" />,
      route: `${basePrefix}/bookings/create`,
      roles: ['student', 'faculty'],
      category: 'core',
    },
    {
      id: 'my-bookings',
      name: 'My Reservations & Queue',
      description: 'Track reservation status, queue position and active access slots',
      icon: <CalendarCheck className="w-5 h-5 text-cyan-400" />,
      route: `${basePrefix}/bookings`,
      roles: ['student', 'faculty'],
      category: 'core',
    },
    {
      id: 'admin-bookings',
      name: 'Campus Booking Registry',
      description: 'Approve, queue, and dispatch all student & faculty reservations',
      icon: <CalendarCheck className="w-5 h-5 text-cyan-400" />,
      route: '/admin/bookings',
      roles: ['admin'],
      category: 'core',
    },
    {
      id: 'dead-stock',
      name: 'Dead-Stock & Equipment Register',
      description: '28 computer purchase batches (BAT0005-BAT0032) & 55 normalized models across Labs D-01 to D-11',
      icon: <HardDrive className="w-5 h-5 text-emerald-400" />,
      route: '#dead-stock',
      roles: ['student', 'faculty', 'admin'],
      badge: '28 Batches',
      category: 'hardware',
      isCustomAction: true,
    },
    {
      id: 'resources',
      name: 'Hardware & Compute Inventory',
      description: 'NVIDIA GPUs, FPGA benches, Cisco switches & robotics kits',
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      route: role === 'admin' ? '/admin/resources' : `${basePrefix}/labs?view=catalog`,
      roles: ['student', 'faculty', 'admin'],
      category: 'hardware',
    },
    {
      id: 'monitoring',
      name: 'IoT Telemetry & Health',
      description: 'Sensor diagnostics, ambient noise, climate & energy telemetry',
      icon: <Activity className="w-5 h-5 text-rose-400" />,
      route: role === 'admin' ? '/admin/monitoring' : `${basePrefix}/dashboard`,
      roles: ['student', 'faculty', 'admin'],
      badge: 'Telemetry',
      category: 'analytics',
    },
    {
      id: 'maintenance',
      name: 'Facility Upkeep & Servicing',
      description: 'Scheduled maintenance, calibration logs & inspection reports',
      icon: <Wrench className="w-5 h-5 text-orange-400" />,
      route: role === 'admin' ? '/admin/maintenance' : `${basePrefix}/dashboard`,
      roles: ['admin'],
      category: 'hardware',
    },
    {
      id: 'reports',
      name: 'Analytics & Campus Reports',
      description: 'Utilization trends, peak hours, resource distribution',
      icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
      route: role === 'admin' ? '/admin/reports' : `${basePrefix}/dashboard`,
      roles: ['admin'],
      category: 'analytics',
    },
    {
      id: 'route',
      name: 'Campus Wayfinding',
      description: 'Interactive building routing between labs, wings and floors',
      icon: <Compass className="w-5 h-5 text-teal-400" />,
      route: `${basePrefix}/route/BK-2026-0923-01`,
      roles: ['student', 'faculty', 'admin'],
      badge: 'GPS',
      category: 'navigation',
    },
  ];

  const filteredServices = services
    .filter((s) => !role || s.roles.includes(role))
    .filter(
      (s) =>
        s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(filterQuery.toLowerCase())
    );

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectService = (item: ServiceItem) => {
    setIsOpen(false);
    if (item.isCustomAction && item.id === 'dead-stock') {
      setIsInventoryOpen(true);
      return;
    }
    navigate(item.route);
  };

  return (
    <>
      {/* Trigger Button in Navbar / Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-sm shrink-0 min-w-[34px] min-h-[34px]"
        title="Open Campus Services Hub"
        aria-label="Campus Services Launcher"
      >
        <Grid className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="hidden sm:inline">Services</span>
      </button>

      {/* Services Modal / Sheet rendered in body portal so it never collides with header */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div
              ref={modalRef}
              className="w-full max-w-2xl rounded-2xl glass-panel border border-slate-800 shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Campus Services Directory</h3>
                    <p className="text-xs text-slate-400">Direct launcher to all facilities, bookings, and hardware tools</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Close services"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Search */}
              <div className="pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search campus services (e.g. labs, gpu, booking, wayfinding)..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Services Grid (Responsive: 1 col on small phones, 2 cols on tablet/desktop) */}
              <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2 max-h-[58vh]">
                {filteredServices.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No campus services match "{filterQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredServices.map((svc) => (
                      <div
                        key={svc.id}
                        onClick={() => handleSelectService(svc)}
                        className="p-3 rounded-xl glass-card border border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 group-hover:scale-105 transition-transform shrink-0">
                            {svc.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                {svc.name}
                              </h4>
                              {svc.badge && (
                                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                  {svc.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {svc.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>SmartCampus Unified Platform</span>
                <span className="font-mono text-[10px] text-indigo-400">Press ESC to dismiss</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
