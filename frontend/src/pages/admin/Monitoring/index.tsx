import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Sliders,
  Cpu,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DoorOpen,
  Users,
} from 'lucide-react';
import {
  useLiveMonitoring,
  useResolveAlert,
  useLabs,
  useResources,
  useAllBookings,
  useMaintenance,
  useSystemHealth,
} from '../../../hooks';
import { MonitoringCard, StatusOverview, AlertList } from '../../../components/monitoring';
import { Button, StatusBadge, Skeleton, Breadcrumbs } from '../../../components/common';
import { Lab } from '../../../types';

type MonitoringState = 'connected' | 'updating' | 'stale' | 'retrieval error' | 'disconnected' | 'no data';

export const AdminMonitoringPage: React.FC = () => {
  // Controlled polling interval: 20s via TanStack Query
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
    isRefetching: isRefetchingOverview,
    dataUpdatedAt,
  } = useLiveMonitoring(20000);

  const resolveAlertMutation = useResolveAlert();
  const { data: labs = [], refetch: refetchLabs } = useLabs();
  const { data: resources = [], refetch: refetchResources } = useResources();
  const { data: allBookings = [], refetch: refetchBookings } = useAllBookings();
  const { data: maintenanceRecords = [], refetch: refetchMaintenance } = useMaintenance();
  const { data: health, isError: isHealthError, refetch: refetchHealth } = useSystemHealth(20000);

  const [monitoringState, setMonitoringState] = useState<MonitoringState>('connected');
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);

  // Monitor freshness and determine exact connection state
  useEffect(() => {
    const timer = setInterval(() => {
      if (dataUpdatedAt) {
        const diff = Math.floor((Date.now() - dataUpdatedAt) / 1000);
        setSecondsSinceSync(diff);

        if (overviewError || isHealthError) {
          setMonitoringState('retrieval error');
        } else if (isRefetchingOverview) {
          setMonitoringState('updating');
        } else if (!overview) {
          setMonitoringState('no data');
        } else if (diff > 45) {
          setMonitoringState('stale');
        } else {
          setMonitoringState('connected');
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [dataUpdatedAt, overviewError, isHealthError, isRefetchingOverview, overview]);

  const handleManualSync = async () => {
    await Promise.all([
      refetchOverview(),
      refetchLabs(),
      refetchResources(),
      refetchBookings(),
      refetchMaintenance(),
      refetchHealth(),
    ]);
  };

  const handleResolveAlert = async (alertId: string) => {
    await resolveAlertMutation.mutateAsync(alertId);
  };

  // Lab status helper: distinguishes Available, Occupied, Full, Maintenance, Offline
  const getLabDisplayStatus = (lab: Lab) => {
    if (lab.operationalStatus === 'maintenance') return 'maintenance';
    if (lab.operationalStatus === 'offline') return 'offline';
    if (lab.operationalStatus === 'occupied') {
      // Check if seats are completely filled
      const activeInLab = allBookings.filter(
        (b) =>
          b.status === 'ACTIVE' &&
          (typeof b.lab === 'object' && b.lab !== null
            ? (b.lab as any).id === lab.id
            : b.lab === lab.id)
      );
      if (activeInLab.length >= lab.capacity) return 'full';
      return 'occupied';
    }
    return 'available';
  };

  const activeBookings = allBookings.filter((b) => b.status === 'ACTIVE');
  const queuedBookings = allBookings.filter((b) => b.status === 'QUEUED' || b.status === 'WAITLISTED');
  const activeMaintenance = maintenanceRecords.filter((m) => m.status === 'in-progress' || m.status === 'scheduled');

  const getStateColor = (state: MonitoringState) => {
    switch (state) {
      case 'connected':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'updating':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'stale':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'retrieval error':
      case 'disconnected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'no data':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Dynamic Monitoring State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Live Operational Telemetry' }]} />
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
              <span>Campus Live Operations</span>
            </h1>

            {/* Connection / Reconnect State Badge */}
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStateColor(
                monitoringState
              )}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  monitoringState === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : monitoringState === 'updating'
                    ? 'bg-blue-400 animate-spin'
                    : monitoringState === 'stale'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span>{monitoringState}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            TanStack Query controlled polling (20s cycle) • Synced{' '}
            <strong className="text-slate-200 font-mono">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Connecting...'}
            </strong>{' '}
            ({secondsSinceSync}s ago)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          isLoading={isRefetchingOverview}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {monitoringState === 'retrieval error' || monitoringState === 'disconnected'
            ? 'Reconnect & Retry'
            : 'Force Resync'}
        </Button>
      </div>

      {/* Backend Core Health Probe Telemetry */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {!isHealthError && health?.status === 'ok' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            )}
          </span>
          <span className="font-semibold text-slate-200">Backend Core Health:</span>
          <span className="font-mono text-[11px] text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
            GET /api/v1/health
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span>
            Status:{' '}
            <strong className={!isHealthError && health?.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
              {health?.status ? health.status.toUpperCase() : overviewLoading ? 'CHECKING...' : 'DISCONNECTED'}
            </strong>
          </span>
          <span>
            Mode: <strong className="text-slate-200 font-mono">{health?.environment ?? 'development'}</strong>
          </span>
          {health?.latencyMs !== undefined && (
            <span>
              Latency: <strong className="text-emerald-400 font-mono">{health.latencyMs}ms</strong>
            </span>
          )}
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MonitoringCard
          title="Active Facility Sessions"
          value={activeBookings.length}
          subtitle={`${queuedBookings.length} waiting in queue`}
          icon={<Clock className="w-6 h-6" />}
          color="emerald"
        />

        <MonitoringCard
          title="Hardware Allocations"
          value={`${overview?.totalResources ? overview.totalResources - (overview?.availableResources || 0) : 5} / ${overview?.totalResources ?? resources.length}`}
          subtitle="Hardware units active"
          icon={<Cpu className="w-6 h-6" />}
          color="indigo"
        />

        <MonitoringCard
          title="Waitlist Queues"
          value={overview?.queuedBookings ?? queuedBookings.length}
          subtitle="Requests awaiting workstation lease"
          icon={<Layers className="w-6 h-6" />}
          color="amber"
        />

        <MonitoringCard
          title="Under Maintenance"
          value={activeMaintenance.length}
          subtitle="Facilities & hardware down"
          icon={<Wrench className="w-6 h-6" />}
          color="blue"
        />
      </div>

      {/* Lab Status Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-indigo-400" />
            <span>Campus Laboratory Facilities ({labs.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Live occupancy and capacity matrix</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {labs.map((lab) => {
            const status = getLabDisplayStatus(lab);
            const activeCount = allBookings.filter(
              (b) =>
                b.status === 'ACTIVE' &&
                (typeof b.lab === 'object' && b.lab !== null
                  ? (b.lab as any).id === lab.id
                  : b.lab === lab.id)
            ).length;

            return (
              <div
                key={lab.id || lab.labId}
                className="glass-card p-4 rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase block">
                      {lab.labId}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5 line-clamp-1">{lab.name}</h4>
                    <p className="text-[11px] text-slate-400">{lab.building} (Floor {lab.floor})</p>
                  </div>
                  <StatusBadge status={status} size="sm" />
                </div>

                {/* Capacity & Occupancy Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Occupancy:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {status === 'occupied' || status === 'full' ? `${activeCount}/${lab.capacity}` : `0/${lab.capacity}`} Seats
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status === 'full'
                          ? 'bg-rose-500 w-full'
                          : status === 'occupied'
                          ? 'bg-blue-500 w-2/3'
                          : status === 'maintenance'
                          ? 'bg-amber-500 w-1/4'
                          : 'bg-emerald-500 w-0'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Assigned Devices: {lab.availableResources?.length || 0}</span>
                  <span className="capitalize">{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capacity Overview & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {overview && <StatusOverview overview={overview} />}

          {/* Active Workstation Runs */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Currently Active Lab Runs ({activeBookings.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">Occupying workstations now</span>
            </div>

            {activeBookings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No active lab runs at this moment.</p>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                {activeBookings.map((b) => (
                  <div key={b.id || b.bookingId} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-semibold">{b.bookingId}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {b.userRole}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-0.5">
                        {typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).name : b.lab}
                      </p>
                    </div>
                    <div className="text-right text-slate-400 font-mono text-[11px]">
                      <span>{b.startTime} - {b.endTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Safety & Hardware Alerts */}
        <div>
          {overview && (
            <AlertList
              alerts={overview.alerts || []}
              onResolve={handleResolveAlert}
            />
          )}
        </div>
      </div>
    </div>
  );
};
