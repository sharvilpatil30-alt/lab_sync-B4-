import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Compass,
  Clock,
  Layers,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Award,
  Cpu,
  AlertTriangle,
  RefreshCw,
  Search as SearchIcon,
  DoorOpen,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import {
  useAuth,
  useLabs,
  useMyBookings,
  useNotifications,
  useLiveMonitoring,
  useAlerts,
} from '../../../hooks';
import { Button, StatusBadge, Skeleton } from '../../../components/common';
import { LabCard } from '../../../components/lab';
import { BookingStatusTracker, QueueStatus } from '../../../components/booking';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quickSearch, setQuickSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: labs = [], isLoading: labsLoading, refetch: refetchLabs } = useLabs();
  const { data: myBookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useMyBookings();
  const { data: notifications = [], refetch: refetchNotifications } = useNotifications();
  const { data: monitoring, isLoading: monitoringLoading, refetch: refetchMonitoring } = useLiveMonitoring();
  const { data: alerts = [], refetch: refetchAlerts } = useAlerts();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchLabs(),
      refetchBookings(),
      refetchNotifications(),
      refetchMonitoring(),
      refetchAlerts(),
    ]);
    setLastUpdated(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/faculty/labs?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate('/faculty/labs');
    }
  };

  // Active faculty sessions
  const activeBooking = myBookings.find((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED');
  const facultyBookings = myBookings.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED' || b.status === 'QUEUED'
  );

  // Operational metrics exposed by backend monitoring
  const totalLabsCount = monitoring?.totalLabs ?? labs.length;
  const availableLabsCount = monitoring?.availableLabs ?? labs.filter((l) => l.operationalStatus === 'available').length;
  const maintenanceLabsCount = monitoring?.maintenanceLabs ?? labs.filter((l) => l.operationalStatus === 'maintenance').length;
  const availableResourcesCount = monitoring?.availableResources ?? 0;
  const totalResourcesCount = monitoring?.totalResources ?? 0;
  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Faculty Academic Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-400">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Faculty Academic & Research Portal</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-[10px] font-mono text-purple-300">
                Priority Tier
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.name || 'Professor'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Prioritized laboratory booking for departmental coursework, research sessions, and compute cluster allocations with automated pre-emption rules.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/faculty/bookings/create')}
              leftIcon={<CalendarPlus className="w-4 h-4" />}
            >
              Reserve Lab for Class/Research
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/faculty/labs')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Browse Facilities
            </Button>
          </div>
        </div>

        {/* Quick Search Shortcut Bar & Last Updated Timestamp */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search research facilities, instruments, or classrooms..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full pl-10 pr-24 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Operational sync: <strong className="text-slate-300 font-mono">{lastUpdated}</strong></span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh live monitoring data"
              aria-label="Refresh live monitoring data"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Operational & Facility Monitoring Overview (Backend Exposed) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Campus Operational & Monitoring State
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Available Facilities */}
          <div
            onClick={() => navigate('/faculty/labs?status=available')}
            className="glass-card p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Facilities Ready
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {monitoringLoading ? <Skeleton className="h-8 w-16" /> : `${availableLabsCount} / ${totalLabsCount}`}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">
              Laboratories open for instant booking
            </p>
          </div>

          {/* Dedicated Hardware Fleet */}
          <div className="glass-card p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Compute / Hardware
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {monitoringLoading ? <Skeleton className="h-8 w-16" /> : `${availableResourcesCount} / ${totalResourcesCount}`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Accelerators & instrument nodes ready
            </p>
          </div>

          {/* Scheduled Maintenance */}
          <div className="glass-card p-4 rounded-xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Under Maintenance
              </span>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {monitoringLoading ? <Skeleton className="h-8 w-16" /> : maintenanceLabsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Scheduled facility downtime
            </p>
          </div>

          {/* Department Reservations */}
          <div
            onClick={() => navigate('/faculty/bookings')}
            className="glass-card p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Department Sessions
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {bookingsLoading ? <Skeleton className="h-8 w-16" /> : facultyBookings.length}
            </div>
            <p className="text-[11px] text-purple-400 mt-1 font-medium">
              Priority academic reservations
            </p>
          </div>
        </div>
      </div>

      {/* Active Research Session Highlight */}
      {activeBooking && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Active Research Session</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Faculty Priority Held
                </span>
                <span className="font-mono text-xs text-purple-400">
                  [{activeBooking.bookingId}]
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/faculty/route/${activeBooking.id || activeBooking.bookingId}`)}
                leftIcon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Route
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/faculty/bookings/${activeBooking.id || activeBooking.bookingId}`)}
              >
                Manage Session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <BookingStatusTracker status={activeBooking.status} />
            </div>
            <div>
              <QueueStatus booking={activeBooking} />
            </div>
          </div>
        </div>
      )}

      {/* Grid: Research Bookings & Bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Department Sessions ({facultyBookings.length})</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/faculty/bookings')}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              All Sessions
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : facultyBookings.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No faculty sessions currently scheduled.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/faculty/bookings/create')}
                leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
              >
                Book Facility
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {facultyBookings.slice(0, 4).map((b) => (
                <div
                  key={b.id || b.bookingId}
                  onClick={() => navigate(`/faculty/bookings/${b.id || b.bookingId}`)}
                  className="p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-400 font-semibold">{b.bookingId}</span>
                      <StatusBadge status={b.status} size="sm" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1 group-hover:text-purple-300 transition-colors">
                      {typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).name : b.lab}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.date} • {b.startTime} - {b.endTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/faculty/route/${b.id || b.bookingId}`)}
                      leftIcon={<Compass className="w-3.5 h-3.5" />}
                    >
                      Route
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/faculty/bookings/${b.id || b.bookingId}`)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col: Faculty Bulletins & Campus Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Operational Bulletins</span>
            </h3>
            {activeAlerts.length > 0 && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {activeAlerts.length} Notice{activeAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 divide-y divide-slate-800/60 max-h-96 overflow-y-auto space-y-3">
            {activeAlerts.map((a) => (
              <div key={a.id} className="pt-2 first:pt-0">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Operational Notice</span>
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">{a.severity}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-snug">{a.message}</p>
              </div>
            ))}

            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="pt-3 first:pt-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{n.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{n.message}</p>
              </div>
            ))}

            {activeAlerts.length === 0 && notifications.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">All faculty laboratory services nominal.</p>
            )}
          </div>
        </div>
      </div>

      {/* Available Campus Facilities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Campus Laboratories Catalog</span>
            </h3>
            <p className="text-xs text-slate-400">Available laboratories ready for coursework allocation</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/faculty/labs')}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Explore All ({labs.length})
          </Button>
        </div>

        {labsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labs.slice(0, 3).map((lab) => (
              <LabCard
                key={lab.id || lab.labId}
                lab={lab}
                onBook={() => navigate(`/faculty/bookings/create?labId=${lab.id || lab.labId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
