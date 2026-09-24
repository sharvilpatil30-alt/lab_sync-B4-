import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Compass,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  DoorOpen,
  DoorClosed,
  BarChart3,
  Search as SearchIcon,
  RefreshCw,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, useLabs, useMyBookings, useNotifications, useAlerts } from '../../../hooks';
import { Button, StatusBadge, Skeleton } from '../../../components/common';
import { LabCard } from '../../../components/lab';
import { BookingStatusTracker, QueueStatus } from '../../../components/booking';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quickSearch, setQuickSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all labs so we can accurately report available vs occupied
  const { data: allLabs = [], isLoading: labsLoading, refetch: refetchLabs } = useLabs();
  const { data: myBookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useMyBookings();
  const { data: notifications = [], refetch: refetchNotifications } = useNotifications();
  const { data: alerts = [], refetch: refetchAlerts } = useAlerts();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchLabs(),
      refetchBookings(),
      refetchNotifications(),
      refetchAlerts(),
    ]);
    setLastUpdated(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/student/labs?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate('/student/labs');
    }
  };

  // Lab metrics
  const availableLabs = allLabs.filter((l) => l.operationalStatus === 'available');
  const occupiedLabs = allLabs.filter((l) => l.operationalStatus === 'occupied');
  const totalLabs = allLabs.length;
  const availabilityPct = totalLabs > 0 ? Math.round((availableLabs.length / totalLabs) * 100) : 0;
  const totalSeats = allLabs.reduce((sum, l) => sum + (l.capacity || 0), 0);
  const availableSeats = availableLabs.reduce((sum, l) => sum + (l.capacity || 0), 0);

  // Bookings metrics
  const activeBooking = myBookings.find(
    (b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED' || b.status === 'QUEUED'
  );
  const upcomingBookings = myBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'QUEUED');

  // Combined notifications & alerts
  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome & Action Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Explore specialized campus research labs, reserve GPU hardware workstations, and monitor real-time queue allocations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/student/bookings/create')}
              leftIcon={<CalendarPlus className="w-4 h-4" />}
            >
              Quick Book Lab
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/student/labs')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Search Labs
            </Button>
          </div>
        </div>

        {/* Quick Search Shortcut Bar & Last Updated Timestamp */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Quick search laboratory or workstation equipment..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full pl-10 pr-24 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Updated: <strong className="text-slate-300 font-mono">{lastUpdated}</strong></span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh live campus data"
              aria-label="Refresh live campus data"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards (Clickable) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Labs */}
        <div
          onClick={() => navigate('/student/labs?status=available')}
          className="glass-card p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">Available Labs</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {labsLoading ? <Skeleton className="h-8 w-16" /> : availableLabs.length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Open for instant reservation
          </p>
        </div>

        {/* Occupied Labs */}
        <div
          onClick={() => navigate('/student/labs?status=occupied')}
          className="glass-card p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">Occupied Labs</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {labsLoading ? <Skeleton className="h-8 w-16" /> : occupiedLabs.length}
          </div>
          <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            In active session / queued
          </p>
        </div>

        {/* Campus Availability Summary */}
        <div
          onClick={() => navigate('/student/labs')}
          className="glass-card p-4 rounded-xl border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">Availability Summary</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {labsLoading ? <Skeleton className="h-8 w-16" /> : `${availabilityPct}% Free`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {availableSeats} / {totalSeats} seats open
          </p>
        </div>

        {/* Upcoming Bookings */}
        <div
          onClick={() => navigate('/student/bookings?tab=upcoming')}
          className="glass-card p-4 rounded-xl border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">Upcoming Bookings</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {bookingsLoading ? <Skeleton className="h-8 w-16" /> : upcomingBookings.length}
          </div>
          <p className="text-[11px] text-indigo-400 mt-1 font-medium">
            {activeBooking ? 'Active lease in effect' : 'No active sessions'}
          </p>
        </div>
      </div>

      {/* Active Session & Queue Tracker */}
      {activeBooking && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Current Reservation State
              </h2>
              <span className="font-mono text-xs text-indigo-400 ml-2">
                [{activeBooking.bookingId}]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/student/route/${activeBooking.id || activeBooking.bookingId}`)}
                leftIcon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
                className="border-indigo-500/30 hover:bg-indigo-500/10"
              >
                Route Shortcut
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/student/bookings/${activeBooking.id || activeBooking.bookingId}`)}
              >
                Booking Details
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

      {/* Grid: Upcoming Bookings & Alerts/Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Bookings ({upcomingBookings.length})</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/bookings')}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              View All
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No upcoming reservations scheduled. Click "Quick Book Lab" to reserve facility access.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/student/bookings/create')}
                leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
              >
                Reserve Workstation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((b) => (
                <div
                  key={b.id || b.bookingId}
                  onClick={() => navigate(`/student/bookings/${b.id || b.bookingId}`)}
                  className="p-4 rounded-xl glass-card border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-400 font-semibold">{b.bookingId}</span>
                      <StatusBadge status={b.status} size="sm" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1 group-hover:text-indigo-300 transition-colors">
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
                      onClick={() => navigate(`/student/route/${b.id || b.bookingId}`)}
                      title="View Campus Route"
                      leftIcon={<Compass className="w-3.5 h-3.5" />}
                    >
                      Route
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/student/bookings/${b.id || b.bookingId}`)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Campus Alerts & Recent Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Campus Alerts & Updates</span>
            </h3>
            {activeAlerts.length > 0 && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 divide-y divide-slate-800/60 max-h-96 overflow-y-auto space-y-3">
            {/* Critical or High Severity Alerts first */}
            {activeAlerts.map((a) => (
              <div key={a.id} className="pt-2 first:pt-0">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Campus Notice</span>
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">{a.severity}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-snug">{a.message}</p>
              </div>
            ))}

            {/* Notifications */}
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="pt-3 first:pt-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
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
              <p className="text-xs text-slate-500 text-center py-6">All campus systems nominal. No active alerts.</p>
            )}
          </div>
        </div>
      </div>

      {/* Available Labs Showcase Today */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Available Facilities Today</span>
            </h3>
            <p className="text-xs text-slate-400">Laboratories currently open with ready workstation benches</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student/labs?status=available')}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Explore All ({availableLabs.length})
          </Button>
        </div>

        {labsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : availableLabs.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-400">
            No facilities currently flagged as available. You can submit a reservation request to join the scheduling queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableLabs.slice(0, 3).map((lab) => (
              <LabCard
                key={lab.id || lab.labId}
                lab={lab}
                onBook={() => navigate(`/student/bookings/create?labId=${lab.id || lab.labId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
