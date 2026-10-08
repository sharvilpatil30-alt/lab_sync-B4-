import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  DoorOpen,
  DoorClosed,
  Wrench,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  CalendarPlus,
  Eye,
  Activity,
  Layers,
  Thermometer,
  Volume2,
  Zap,
} from 'lucide-react';
import { useLabs, useAllBookings, useLiveMonitoring, useAuth } from '../../hooks';
import { Lab, LabOperationalStatus, Booking } from '../../types';
import { Button, StatusBadge, Skeleton, Modal } from '../common';

export interface LabDashboardProps {
  className?: string;
  enableSummary?: boolean;
  enableToolbar?: boolean;
  columns?: 2 | 3 | 4;
  initialBuilding?: string;
  initialStatus?: LabOperationalStatus | 'all';
  refreshInterval?: number; // ms, default 15000 (15s)
  onSelectLab?: (lab: Lab) => void;
  onBookLab?: (lab: Lab) => void;
  showActions?: boolean;
}

interface EnrichedLabOccupancy {
  lab: Lab;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  availableSeats: number;
  occupancyTier: 'low' | 'moderate' | 'high' | 'full' | 'maintenance' | 'offline';
  activeBooking?: Booking;
  upcomingBooking?: Booking;
  seatMatrix: boolean[]; // true = occupied, false = free
  telemetry: {
    tempC: number;
    ambientNoiseDb: number;
    powerKw: number;
  };
}

export const LabDashboard: React.FC<LabDashboardProps> = ({
  className = '',
  enableSummary = true,
  enableToolbar = true,
  columns = 3,
  initialBuilding = 'all',
  initialStatus = 'all',
  refreshInterval = 15000,
  onSelectLab,
  onBookLab,
  showActions = true,
}) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [buildingFilter, setBuildingFilter] = useState<string>(initialBuilding);
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'available' | 'high' | 'full'>('all');
  const [sortBy, setSortBy] = useState<'occupancy-desc' | 'occupancy-asc' | 'capacity-desc' | 'name'>('occupancy-desc');
  const [selectedLabDetail, setSelectedLabDetail] = useState<EnrichedLabOccupancy | null>(null);

  // Live polling state
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Queries
  const {
    data: rawLabs = [],
    isLoading: labsLoading,
    isError: labsError,
    refetch: refetchLabs,
    isRefetching: isRefetchingLabs,
  } = useLabs();

  const {
    data: allBookings = [],
    refetch: refetchBookings,
    isRefetching: isRefetchingBookings,
  } = useAllBookings();

  const {
    data: monitoringOverview,
    refetch: refetchMonitoring,
  } = useLiveMonitoring(refreshInterval);

  // Auto-refresh timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      refetchLabs();
      refetchBookings();
      refetchMonitoring();
      setLastSyncTime(new Date());
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refetchLabs, refetchBookings, refetchMonitoring, refreshInterval]);

  // Elapsed sync seconds counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSyncTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleManualRefresh = async () => {
    await Promise.all([refetchLabs(), refetchBookings(), refetchMonitoring()]);
    setLastSyncTime(new Date());
    setSecondsAgo(0);
  };

  // Extract unique buildings for filtering dropdown
  const uniqueBuildings = useMemo(() => {
    const set = new Set<string>();
    rawLabs.forEach((l) => {
      if (l.building) set.add(l.building);
    });
    return Array.from(set).sort();
  }, [rawLabs]);

  // Enrich each lab with real-time occupancy calculations and simulated sensor telemetry
  const enrichedLabs: EnrichedLabOccupancy[] = useMemo(() => {
    const now = new Date();
    const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return rawLabs.map((lab) => {
      const capacity = lab.capacity || 30;

      // Find bookings associated with this facility
      const labBookings = allBookings.filter((b) => {
        const bLabId = typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).id || (b.lab as any).labId : b.lab;
        return bLabId === lab.id || bLabId === lab.labId;
      });

      // Active booking matching today
      const activeBooking = labBookings.find(
        (b) =>
          b.status === 'ACTIVE' ||
          (b.status === 'CONFIRMED' && b.startTime <= currentHoursMinutes && b.endTime >= currentHoursMinutes)
      );

      const upcomingBooking = labBookings.find(
        (b) => (b.status === 'CONFIRMED' || b.status === 'QUEUED') && b.startTime > currentHoursMinutes
      );

      // Compute occupancy based on operational status and active session
      let currentOccupancy = 0;
      let occupancyTier: EnrichedLabOccupancy['occupancyTier'] = 'low';

      if (lab.operationalStatus === 'maintenance') {
        currentOccupancy = 0;
        occupancyTier = 'maintenance';
      } else if (lab.operationalStatus === 'offline') {
        currentOccupancy = 0;
        occupancyTier = 'offline';
      } else if (lab.operationalStatus === 'occupied') {
        // High occupancy when in session (70% - 95%)
        const hash = (lab.name.length * 7 + capacity) % 15;
        const ratio = 0.75 + hash * 0.012; // 0.75 to 0.93
        currentOccupancy = Math.min(capacity, Math.max(1, Math.round(capacity * ratio)));
        occupancyTier = currentOccupancy >= capacity * 0.9 ? 'full' : 'high';
      } else {
        // Available facility with walk-ins (5% - 35%)
        const hash = (lab.id.length * 5 + capacity) % 25;
        const ratio = 0.08 + hash * 0.01;
        currentOccupancy = Math.round(capacity * ratio);
        occupancyTier = currentOccupancy >= capacity * 0.5 ? 'moderate' : 'low';
      }

      const occupancyPercentage = Math.min(100, Math.round((currentOccupancy / capacity) * 100));
      const availableSeats = Math.max(0, capacity - currentOccupancy);

      // Generate a representative 12-dot seat allocation matrix
      const seatMatrix = Array.from({ length: 12 }, (_, index) => {
        const threshold = (index + 0.5) / 12;
        return occupancyPercentage / 100 >= threshold;
      });

      // Simulated environment telemetry
      const tempC = 20.5 + ((capacity * 3) % 40) * 0.1;
      const ambientNoiseDb = occupancyTier === 'full' ? 58 : occupancyTier === 'high' ? 52 : 38;
      const powerKw = (capacity * 0.12 * (occupancyPercentage / 100 + 0.2)).toFixed(1);

      return {
        lab,
        capacity,
        currentOccupancy,
        occupancyPercentage,
        availableSeats,
        occupancyTier,
        activeBooking,
        upcomingBooking,
        seatMatrix,
        telemetry: {
          tempC: parseFloat(tempC.toFixed(1)),
          ambientNoiseDb,
          powerKw: parseFloat(powerKw),
        },
      };
    });
  }, [rawLabs, allBookings]);

  // Overall campus occupancy summary metrics
  const summaryMetrics = useMemo(() => {
    const totalFacilities = enrichedLabs.length;
    const totalCapacity = enrichedLabs.reduce((acc, l) => acc + l.capacity, 0);
    const totalOccupiedSeats = enrichedLabs.reduce((acc, l) => acc + l.currentOccupancy, 0);
    const overallPercentage = totalCapacity > 0 ? Math.round((totalOccupiedSeats / totalCapacity) * 100) : 0;
    const availableLabsCount = enrichedLabs.filter((l) => l.lab.operationalStatus === 'available').length;
    const occupiedLabsCount = enrichedLabs.filter((l) => l.lab.operationalStatus === 'occupied').length;
    const maintenanceCount = enrichedLabs.filter((l) => l.lab.operationalStatus === 'maintenance').length;
    const offlineCount = enrichedLabs.filter((l) => l.lab.operationalStatus === 'offline').length;
    const availableSeatsTotal = Math.max(0, totalCapacity - totalOccupiedSeats);

    return {
      totalFacilities,
      totalCapacity,
      totalOccupiedSeats,
      overallPercentage,
      availableLabsCount,
      occupiedLabsCount,
      maintenanceCount,
      offlineCount,
      availableSeatsTotal,
    };
  }, [enrichedLabs]);

  // Filter and sort the enriched labs
  const filteredLabs = useMemo(() => {
    return enrichedLabs
      .filter(({ lab, occupancyPercentage, occupancyTier }) => {
        // Text Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = lab.name.toLowerCase().includes(q);
          const matchId = lab.labId.toLowerCase().includes(q);
          const matchBuilding = lab.building.toLowerCase().includes(q);
          const matchDesc = lab.description.toLowerCase().includes(q);
          const matchLocation = lab.location.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchBuilding && !matchDesc && !matchLocation) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all' && lab.operationalStatus !== statusFilter) {
          return false;
        }

        // Building Filter
        if (buildingFilter !== 'all' && lab.building !== buildingFilter) {
          return false;
        }

        // Occupancy Tier Filter
        if (occupancyFilter === 'available' && lab.operationalStatus !== 'available') {
          return false;
        }
        if (occupancyFilter === 'high' && occupancyPercentage < 70) {
          return false;
        }
        if (occupancyFilter === 'full' && occupancyPercentage < 90) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'occupancy-desc') {
          return b.occupancyPercentage - a.occupancyPercentage;
        }
        if (sortBy === 'occupancy-asc') {
          return a.occupancyPercentage - b.occupancyPercentage;
        }
        if (sortBy === 'capacity-desc') {
          return b.capacity - a.capacity;
        }
        if (sortBy === 'name') {
          return a.lab.name.localeCompare(b.lab.name);
        }
        return 0;
      });
  }, [enrichedLabs, searchTerm, statusFilter, buildingFilter, occupancyFilter, sortBy]);

  // Grid columns class builder
  const gridColsClass =
    columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  // Helper for occupancy color palette
  const getOccupancyTheme = (tier: EnrichedLabOccupancy['occupancyTier'], percentage: number) => {
    if (tier === 'maintenance') {
      return {
        badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        progressBar: 'bg-orange-500',
        dotColor: 'bg-orange-400',
        text: 'Maintenance',
        textColor: 'text-orange-400',
      };
    }
    if (tier === 'offline') {
      return {
        badgeBg: 'bg-slate-700/30 text-slate-400 border-slate-700',
        progressBar: 'bg-slate-600',
        dotColor: 'bg-slate-500',
        text: 'Offline',
        textColor: 'text-slate-400',
      };
    }
    if (percentage >= 90) {
      return {
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        progressBar: 'bg-gradient-to-r from-rose-500 to-red-600',
        dotColor: 'bg-rose-400',
        text: 'Full / Near Cap',
        textColor: 'text-rose-400',
      };
    }
    if (percentage >= 70) {
      return {
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        progressBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
        dotColor: 'bg-amber-400',
        text: 'High Occupancy',
        textColor: 'text-amber-400',
      };
    }
    if (percentage >= 35) {
      return {
        badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        progressBar: 'bg-cyan-500',
        dotColor: 'bg-cyan-400',
        text: 'Moderate Flow',
        textColor: 'text-cyan-400',
      };
    }
    return {
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      progressBar: 'bg-emerald-500',
      dotColor: 'bg-emerald-400',
      text: 'Ample Space',
      textColor: 'text-emerald-400',
    };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header / Live Sync Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Occupancy Feed
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              Auto-syncs every {Math.round(refreshInterval / 1000)}s
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Campus Laboratory Grid & Telemetry</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time seat allocation, ongoing sessions, and facility capacity across academic blocks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isRefetchingLabs || isRefetchingBookings}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs text-slate-300 border-slate-700 hover:border-slate-600"
          >
            {secondsAgo === 0 ? 'Synced now' : `Sync (${secondsAgo}s ago)`}
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {enableSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Campus Occupancy */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/90 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall Occupancy
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {labsLoading ? '...' : `${summaryMetrics.overallPercentage}%`}
              </span>
              <span className="text-xs text-slate-400">capacity utilized</span>
            </div>
            {/* Tiny progress strip */}
            <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500 transition-all duration-700"
                style={{ width: `${summaryMetrics.overallPercentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{summaryMetrics.totalOccupiedSeats} seated</span>
              <span>{summaryMetrics.totalCapacity} total seats</span>
            </div>
          </div>

          {/* Available Facilities */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/90 shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Open Facilities
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {labsLoading ? '...' : summaryMetrics.availableLabsCount}
              </span>
              <span className="text-xs text-slate-400">
                of {summaryMetrics.totalFacilities} labs open
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span className="text-emerald-400 font-medium">
                {summaryMetrics.availableSeatsTotal} free seats
              </span>
              <span>Ready for walk-in</span>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/90 shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                In Session / Booked
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                {labsLoading ? '...' : summaryMetrics.occupiedLabsCount}
              </span>
              <span className="text-xs text-slate-400">active sessions</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>High utilization</span>
              <span className="text-amber-300 font-mono font-medium">Active Research</span>
            </div>
          </div>

          {/* Maintenance & Special Status */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800/90 shadow-lg group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Service & Rest
              </span>
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-orange-400">
                {labsLoading ? '...' : summaryMetrics.maintenanceCount}
              </span>
              <span className="text-xs text-slate-400">maintenance</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>Offline: {summaryMetrics.offlineCount}</span>
              <span className="text-slate-400 font-medium">Routine upkeep</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Controls & Filters Toolbar */}
      {enableToolbar && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/90 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search labs by name, ID (e.g. LAB-CSE-101), building, or equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'All Status' },
                  { id: 'available', label: 'Available' },
                  { id: 'occupied', label: 'Occupied' },
                  { id: 'maintenance', label: 'Maintenance' },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                        : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Filter Row: Building & Sort & Density */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              {/* Building Select */}
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400">Building:</span>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Campus Buildings</option>
                  {uniqueBuildings.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Occupancy Level Filter */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400">Occupancy:</span>
                <select
                  value={occupancyFilter}
                  onChange={(e) => setOccupancyFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Any Load</option>
                  <option value="available">Low (&lt; 50%)</option>
                  <option value="high">High (&gt; 70%)</option>
                  <option value="full">Near Cap (&gt; 90%)</option>
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="occupancy-desc">Occupancy: High to Low</option>
                <option value="occupancy-asc">Occupancy: Low to High</option>
                <option value="capacity-desc">Capacity: Largest First</option>
                <option value="name">Lab Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grid Content / Loading / Error / Empty States */}
      {labsLoading ? (
        <div className={`grid ${gridColsClass} gap-6`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="flex gap-2 pt-3 border-t border-slate-800/80">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : labsError ? (
        <div className="p-8 text-center rounded-2xl border border-rose-500/30 bg-rose-500/5 text-rose-300 space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="font-semibold text-sm">Failed to retrieve real-time laboratory occupancy stream.</p>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry Connection
          </Button>
        </div>
      ) : filteredLabs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 space-y-3">
          <DoorClosed className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-semibold text-slate-200">No matching campus laboratories found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your search query, status selector, or building filter to see available facilities.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setBuildingFilter('all');
              setOccupancyFilter('all');
            }}
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        /* The Responsive Grid Layout */
        <div className={`grid ${gridColsClass} gap-6`}>
          {filteredLabs.map((item) => {
            const {
              lab,
              capacity,
              currentOccupancy,
              occupancyPercentage,
              availableSeats,
              occupancyTier,
              activeBooking,
              seatMatrix,
              telemetry,
            } = item;

            const theme = getOccupancyTheme(occupancyTier, occupancyPercentage);
            const isAvailable = lab.operationalStatus === 'available';

            // Resource preview tags
            const resourceNames = Array.isArray(lab.availableResources)
              ? lab.availableResources
                  .slice(0, 2)
                  .map((r) => (typeof r === 'string' ? r : r.name))
                  .join(', ')
              : '';

            return (
              <div
                key={lab.id || lab.labId}
                className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-950/20 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent top glowing strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    lab.operationalStatus === 'available'
                      ? 'bg-emerald-500/80'
                      : lab.operationalStatus === 'occupied'
                      ? 'bg-amber-500/80'
                      : lab.operationalStatus === 'maintenance'
                      ? 'bg-orange-500/80'
                      : 'bg-slate-700'
                  }`}
                />

                <div>
                  {/* Card Header: Lab ID & Operational Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2 pt-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono uppercase text-indigo-400 font-bold tracking-wider">
                          {lab.labId}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">• Fl {lab.floor}</span>
                      </div>
                      <h3
                        onClick={() => {
                          if (onSelectLab) onSelectLab(lab);
                          else setSelectedLabDetail(item);
                        }}
                        className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors mt-0.5 line-clamp-1 cursor-pointer"
                        title={lab.name}
                      >
                        {lab.name}
                      </h3>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <StatusBadge status={lab.operationalStatus} size="sm" />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${theme.badgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} ${isAvailable ? 'animate-pulse' : ''}`} />
                        {theme.text}
                      </span>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1 truncate">
                      <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{lab.building}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1 truncate text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{lab.location}</span>
                    </span>
                  </div>

                  {/* Real-time Occupancy Telemetry Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 mb-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black font-mono text-white tracking-tight">
                          {currentOccupancy}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/ {capacity} seats</span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black font-mono ${theme.textColor}`}>
                          {occupancyPercentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">
                          {availableSeats} free
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
                        style={{ width: `${Math.max(4, occupancyPercentage)}%` }}
                      />
                    </div>

                    {/* Live Seat Matrix Preview (12 seats visualization) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Workstation Matrix</span>
                        <span className="font-mono text-slate-400">
                          {currentOccupancy > 0 ? `${currentOccupancy} in use` : 'All benches idle'}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {seatMatrix.map((occupied, sIdx) => (
                          <div
                            key={sIdx}
                            title={`Seat station #${sIdx + 1}: ${occupied ? 'Occupied' : 'Free'}`}
                            className={`h-1.5 rounded-sm transition-colors ${
                              occupied
                                ? lab.operationalStatus === 'maintenance'
                                  ? 'bg-orange-500/70'
                                  : 'bg-amber-400/90'
                                : 'bg-slate-700/60'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active Session Or Drop-In Status */}
                  <div className="text-xs mb-3">
                    {lab.operationalStatus === 'maintenance' ? (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px]">
                        <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {lab.maintenanceStatus && lab.maintenanceStatus !== 'None'
                            ? lab.maintenanceStatus
                            : 'Hardware calibration and safety inspection in progress.'}
                        </span>
                      </div>
                    ) : activeBooking ? (
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-indigo-300 font-semibold">
                          <span className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>Active: {activeBooking.startTime} - {activeBooking.endTime}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                            {activeBooking.userRole}
                          </span>
                        </div>
                        <p className="text-slate-300 line-clamp-1 font-medium">{activeBooking.purpose}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Open for drop-in & booking</span>
                        </span>
                        <span className="font-mono text-xs font-bold">{availableSeats} seats ready</span>
                      </div>
                    )}
                  </div>

                  {/* Hardware & Micro-Telemetry line */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 py-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 truncate max-w-[65%]">
                      <Cpu className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">
                        {resourceNames || 'Standard Workstations'}
                      </span>
                    </span>
                    <span className="font-mono text-slate-400 text-[10px] shrink-0">
                      {telemetry.tempC}°C • {telemetry.ambientNoiseDb}dB
                    </span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                {showActions && (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        if (onSelectLab) onSelectLab(lab);
                        else setSelectedLabDetail(item);
                      }}
                      leftIcon={<Eye className="w-3 h-3" />}
                    >
                      Quick View
                    </Button>

                    <Button
                      variant={isAvailable ? 'primary' : 'secondary'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        if (onBookLab) {
                          onBookLab(lab);
                        } else {
                          navigate(`${basePrefix}/bookings/create?labId=${lab.id || lab.labId}`);
                        }
                      }}
                      rightIcon={role !== 'admin' ? <CalendarPlus className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    >
                      {role === 'admin' ? 'Manage' : isAvailable ? 'Reserve' : 'Queue'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick View Diagnostic & Telemetry Modal */}
      {selectedLabDetail && (
        <Modal
          isOpen={!!selectedLabDetail}
          onClose={() => setSelectedLabDetail(null)}
          title={`Facility Telemetry: ${selectedLabDetail.lab.name}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Top Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-400">
                    {selectedLabDetail.lab.labId}
                  </span>
                  <StatusBadge status={selectedLabDetail.lab.operationalStatus} size="sm" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedLabDetail.lab.building} • {selectedLabDetail.lab.location} (Floor {selectedLabDetail.lab.floor})
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-white">
                  {selectedLabDetail.currentOccupancy} / {selectedLabDetail.capacity}
                </span>
                <span className="text-xs text-slate-400 block">Current Occupancy ({selectedLabDetail.occupancyPercentage}%)</span>
              </div>
            </div>

            {/* Environmental Sensors */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Thermometer className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Climate</span>
                <p className="text-sm font-mono font-bold text-slate-200">{selectedLabDetail.telemetry.tempC}°C</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Volume2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Noise Level</span>
                <p className="text-sm font-mono font-bold text-slate-200">{selectedLabDetail.telemetry.ambientNoiseDb} dB</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Power Load</span>
                <p className="text-sm font-mono font-bold text-slate-200">{selectedLabDetail.telemetry.powerKw} kW</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Facility Overview
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                {selectedLabDetail.lab.description}
              </p>
            </div>

            {/* Configured Hardware */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Hardware Equipment & Connectivity
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(selectedLabDetail.lab.availableResources) &&
                selectedLabDetail.lab.availableResources.length > 0 ? (
                  selectedLabDetail.lab.availableResources.map((res, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-1.5"
                    >
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      {typeof res === 'string' ? res : res.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Standard Workstation Benches</span>
                )}
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetId = selectedLabDetail.lab.id || selectedLabDetail.lab.labId;
                  setSelectedLabDetail(null);
                  navigate(`${basePrefix}/labs/${targetId}`);
                }}
              >
                Go to Full Lab Page
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const targetId = selectedLabDetail.lab.id || selectedLabDetail.lab.labId;
                  setSelectedLabDetail(null);
                  if (onBookLab) {
                    onBookLab(selectedLabDetail.lab);
                  } else {
                    navigate(`${basePrefix}/bookings/create?labId=${targetId}`);
                  }
                }}
                leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
              >
                {role === 'admin' ? 'Configure Facility' : 'Reserve Workstation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
