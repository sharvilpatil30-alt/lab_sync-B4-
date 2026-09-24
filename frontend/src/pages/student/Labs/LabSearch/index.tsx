import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RefreshCw, X } from 'lucide-react';
import { useLabs } from '../../../../hooks';
import { LabFilters, Lab } from '../../../../types';
import { LabCard, LabFilterPanel } from '../../../../components/lab';
import { Search, Button, EmptyState, Skeleton, ErrorMessage } from '../../../../components/common';

export const LabSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial filter values from URL search params
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [filters, setFilters] = useState<LabFilters>(() => ({
    status: (searchParams.get('status') as any) || 'all',
    availability: (searchParams.get('availability') as any) || 'all',
    building: searchParams.get('building') || 'all',
    capacity: searchParams.get('capacity') ? parseInt(searchParams.get('capacity')!, 10) : undefined,
    date: searchParams.get('date') || '',
    startTime: searchParams.get('startTime') || '',
    endTime: searchParams.get('endTime') || '',
    equipment: searchParams.get('equipment') || '',
    capability: searchParams.get('capability') || '',
  }));

  const [showFilters, setShowFilters] = useState(() => {
    // Automatically open filter panel if URL has active filters
    return !!(
      searchParams.get('status') ||
      searchParams.get('availability') ||
      searchParams.get('building') ||
      searchParams.get('capacity') ||
      searchParams.get('date') ||
      searchParams.get('equipment') ||
      searchParams.get('capability')
    );
  });

  // Synchronize state back into URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.availability && filters.availability !== 'all') params.set('availability', filters.availability);
    if (filters.building && filters.building !== 'all') params.set('building', filters.building);
    if (filters.capacity) params.set('capacity', String(filters.capacity));
    if (filters.date) params.set('date', filters.date);
    if (filters.startTime) params.set('startTime', filters.startTime);
    if (filters.endTime) params.set('endTime', filters.endTime);
    if (filters.equipment) params.set('equipment', filters.equipment);
    if (filters.capability) params.set('capability', filters.capability);

    setSearchParams(params, { replace: true });
  }, [searchTerm, filters, setSearchParams]);

  const activeFilters = useMemo(
    () => ({
      ...filters,
      search: searchTerm,
    }),
    [filters, searchTerm]
  );

  const { data: labs = [], isLoading, error, refetch, isRefetching } = useLabs(activeFilters);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      availability: 'all',
      building: 'all',
      capacity: undefined,
      date: '',
      startTime: '',
      endTime: '',
      equipment: '',
      capability: '',
    });
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    (filters.status && filters.status !== 'all') ||
    (filters.availability && filters.availability !== 'all') ||
    (filters.building && filters.building !== 'all') ||
    Boolean(filters.capacity) ||
    Boolean(filters.date) ||
    Boolean(filters.equipment) ||
    Boolean(filters.capability);

  // Grouped stats for quick state pills
  const availableCount = labs.filter((l) => l.operationalStatus === 'available').length;
  const occupiedCount = labs.filter((l) => l.operationalStatus === 'occupied').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campus Laboratories</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter by capacity and equipment, and verify real-time workstation availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
        </div>
      </div>

      {/* Search Input Bar & Quick Availability Pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Search
            placeholder="Search by lab name, room number, building, or description..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1"
          />
        </div>

        {/* Quick Availability Selector Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, availability: 'all', status: 'all' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              (!filters.availability || filters.availability === 'all') && (!filters.status || filters.status === 'all')
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Laboratories ({labs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, availability: 'available', status: 'available' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              filters.status === 'available' || filters.availability === 'available'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Available Now ({availableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, availability: 'occupied', status: 'occupied' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              filters.status === 'occupied' || filters.availability === 'occupied'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Occupied / Queued ({occupiedCount})
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center gap-1 transition-colors ml-auto"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <LabFilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorMessage
          title="Could not load laboratories"
          message={(error as any)?.message || 'An error occurred while connecting to the lab service.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Lab List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : labs.length === 0 ? (
        <EmptyState
          title="No Laboratories Found"
          description="Try broadening your search query, clearing specific equipment requirements, or resetting active capacity/status filters."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-200 font-semibold">{labs.length}</strong> campus laboratories
            </span>
            {filters.date && (
              <span className="text-indigo-400">
                Filtered for Date: <strong className="font-mono">{filters.date}</strong>
                {filters.startTime ? ` (${filters.startTime} - ${filters.endTime || 'End'})` : ''}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {labs.map((lab: Lab) => (
              <LabCard
                key={lab.id || lab.labId}
                lab={lab}
                selectedDate={filters.date}
                selectedTime={
                  filters.startTime && filters.endTime ? `${filters.startTime} - ${filters.endTime}` : undefined
                }
                onBook={() => {
                  const query = new URLSearchParams();
                  query.set('labId', lab.id || lab.labId);
                  if (filters.date) query.set('date', filters.date);
                  if (filters.startTime) query.set('startTime', filters.startTime);
                  if (filters.endTime) query.set('endTime', filters.endTime);
                  navigate(`/student/bookings/create?${query.toString()}`);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
