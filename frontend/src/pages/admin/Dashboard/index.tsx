import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Cpu,
  Wrench,
  BookOpenCheck,
  Activity,
  BarChart3,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  DoorOpen,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';
import {
  useLiveMonitoring,
  useLabs,
  useAllBookings,
  useMaintenance,
  useResources,
  useReportsDashboard,
} from '../../../hooks';
import { MonitoringCard, StatusOverview, AlertList } from '../../../components/monitoring';
import { Button, StatusBadge, Skeleton } from '../../../components/common';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useLiveMonitoring(20000);
  const { data: labs = [], refetch: refetchLabs } = useLabs();
  const { data: allBookings = [], refetch: refetchBookings } = useAllBookings();
  const { data: maintenanceRecords = [], refetch: refetchMaintenance } = useMaintenance();
  const { data: resources = [], refetch: refetchResources } = useResources();
  const { data: reportsData } = useReportsDashboard();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchOverview(),
      refetchLabs(),
      refetchBookings(),
      refetchMaintenance(),
      refetchResources(),
    ]);
    setIsRefreshing(false);
  };

  // Operational metrics
  const totalLabs = overview?.totalLabs ?? labs.length;
  const availableLabs = overview?.availableLabs ?? labs.filter((l) => l.operationalStatus === 'available').length;
  const occupiedLabs = overview?.occupiedLabs ?? labs.filter((l) => l.operationalStatus === 'occupied').length;
  const maintenanceLabs = overview?.maintenanceLabs ?? labs.filter((l) => l.operationalStatus === 'maintenance').length;
  const offlineLabs = labs.filter((l) => l.operationalStatus === 'offline').length;

  const activeBookings = allBookings.filter((b) => b.status === 'ACTIVE').length;
  const pendingBookings = allBookings.filter((b) => b.status === 'PENDING' || b.status === 'VALIDATED' || b.status === 'REQUESTED').length;
  const queueSize = overview?.queuedBookings ?? allBookings.filter((b) => b.status === 'QUEUED' || b.status === 'WAITLISTED').length;

  const totalResources = overview?.totalResources ?? resources.length;
  const availableResources = overview?.availableResources ?? resources.filter((r) => r.operationalStatus === 'available').length;
  const inUseResources = resources.filter((r) => r.operationalStatus === 'in-use').length;
  const maintenanceResources = resources.filter((r) => r.operationalStatus === 'maintenance').length;

  const activeAlerts = overview?.alerts?.filter((a) => !a.resolved) || [];
  const utilizationRate = reportsData?.summary.averageUtilization ?? 68;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              System Administration
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Operational Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Global overview of campus laboratories, equipment lifecycle, real-time queues, and safety alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs text-slate-300"
            >
              Sync Telemetry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/monitoring')}
              leftIcon={<Activity className="w-4 h-4 text-emerald-400" />}
            >
              Live Monitoring
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/reports')}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Analytics & Reports
            </Button>
          </div>
        </div>

        {/* Quick Admin Navigation Shortcuts */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/resources/add')}
            leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-400" />}
            className="text-xs"
          >
            Add Hardware Resource
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/maintenance')}
            leftIcon={<Wrench className="w-3.5 h-3.5 text-amber-400" />}
            className="text-xs"
          >
            Schedule Maintenance
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/bookings')}
            leftIcon={<BookOpenCheck className="w-3.5 h-3.5 text-purple-400" />}
            className="text-xs"
          >
            View All Bookings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/labs')}
            leftIcon={<DoorOpen className="w-3.5 h-3.5 text-emerald-400" />}
            className="text-xs"
          >
            Manage Labs
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Labs with Breakdown */}
        <div
          onClick={() => navigate('/admin/labs')}
          className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Campus Laboratories
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {overviewLoading ? <Skeleton className="h-9 w-16" /> : totalLabs}
            </div>
            <p className="text-[11px] text-indigo-400 font-medium mt-0.5">
              {availableLabs} Available • {occupiedLabs} Occupied
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Maintenance: <strong className="text-amber-400">{maintenanceLabs}</strong></span>
            <span>Offline: <strong className="text-slate-500">{offlineLabs}</strong></span>
          </div>
        </div>

        {/* Active & Pending Bookings */}
        <div
          onClick={() => navigate('/admin/bookings')}
          className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Bookings
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">
              {overviewLoading ? <Skeleton className="h-9 w-16" /> : activeBookings}
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              Currently running in facility benches
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending: <strong className="text-blue-400">{pendingBookings}</strong></span>
            <span>Total Logged: <strong className="text-slate-300">{allBookings.length}</strong></span>
          </div>
        </div>

        {/* Queue Size & Waitlist */}
        <div
          onClick={() => navigate('/admin/bookings?status=QUEUED')}
          className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Scheduling Queue Size
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-400">
              {overviewLoading ? <Skeleton className="h-9 w-16" /> : queueSize}
            </div>
            <p className="text-[11px] text-amber-400 font-medium mt-0.5">
              Requests waiting for allocation
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Auto-Lease: <strong className="text-emerald-400">Active</strong></span>
            <span>Priority Held: <strong className="text-purple-400">Yes</strong></span>
          </div>
        </div>

        {/* Hardware Resource Availability */}
        <div
          onClick={() => navigate('/admin/resources')}
          className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Resource Availability
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {overviewLoading ? <Skeleton className="h-9 w-16" /> : `${availableResources} / ${totalResources}`}
            </div>
            <p className="text-[11px] text-blue-400 font-medium mt-0.5">
              Hardware units available right now
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>In-Use: <strong className="text-blue-300">{inUseResources}</strong></span>
            <span>Under Maint: <strong className="text-amber-400">{maintenanceResources}</strong></span>
          </div>
        </div>
      </div>

      {/* Utilization Summary Bar & Alert Indicators */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Campus Utilization Summary & Engine Health
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Average Facility Utilization:</span>
            <span className="text-sm font-extrabold text-indigo-400 font-mono">
              {utilizationRate}%
            </span>
          </div>
        </div>

        {/* Utilization Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Low Workload (&lt;40%)</span>
            <span>Balanced Operating Envelope</span>
            <span>Peak Demand Capacity (&gt;85%)</span>
          </div>
        </div>
      </div>

      {/* Status Overview & Live Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {overview && <StatusOverview overview={overview} />}
        </div>
        <div>
          {overview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Campus Alerts ({activeAlerts.length})</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/monitoring')}
                  className="text-[11px] text-indigo-400"
                >
                  Monitoring Telemetry
                </Button>
              </div>
              <AlertList alerts={overview.alerts || []} />
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity: Global Bookings & Scheduled Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Global Bookings */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Recent Reservation Activity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest session requests across the institution</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/bookings')}
              className="text-xs text-indigo-400"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              All ({allBookings.length})
            </Button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
            {allBookings.slice(0, 5).map((b) => (
              <div
                key={b.id || b.bookingId}
                onClick={() => navigate(`/admin/bookings/${b.id || b.bookingId}`)}
                className="py-3 px-2 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-semibold">{b.bookingId}</span>
                    <StatusBadge status={b.status} size="sm" />
                    <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800">
                      {b.userRole}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium mt-1 group-hover:text-indigo-300 transition-colors">
                    {typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).name : b.lab}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{b.purpose}</p>
                </div>

                <div className="text-right text-slate-400 shrink-0">
                  <p className="font-medium text-slate-200">{b.date}</p>
                  <p className="text-[11px]">{b.startTime} - {b.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Maintenance & Service Events */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Maintenance & Hardware Activity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Work orders, inspections, and lifecycle events</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/maintenance')}
              className="text-xs text-indigo-400"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              All ({maintenanceRecords.length})
            </Button>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
            {maintenanceRecords.slice(0, 5).map((m) => (
              <div
                key={m.id || m.maintenanceId}
                onClick={() => navigate('/admin/maintenance')}
                className="py-3 px-2 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-semibold">{m.maintenanceId}</span>
                    <StatusBadge status={m.status} size="sm" />
                    <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800">
                      Target: {m.targetType}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium mt-1 group-hover:text-amber-300 transition-colors line-clamp-1">
                    {m.description}
                  </p>
                </div>

                <div className="text-right text-slate-400 shrink-0">
                  <p className="text-[11px] font-medium text-slate-300">
                    {new Date(m.startDate).toLocaleDateString()}
                  </p>
                  <span className="text-[10px] text-slate-500">Scheduled window</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
