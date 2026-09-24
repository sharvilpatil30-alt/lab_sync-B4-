import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building,
  MapPin,
  Users,
  CalendarPlus,
  Compass,
  ArrowLeft,
  Cpu,
  Layers,
  Clock,
  Calendar,
  Navigation,
} from 'lucide-react';
import { useLab, useResources, useCampusRoute, useAuth } from '../../../../hooks';
import { Button, StatusBadge, Skeleton, Breadcrumbs, ErrorMessage, Input } from '../../../../components/common';
import { AvailabilityIndicator } from '../../../../components/lab';
import { RouteTopology } from '../../../../components/route';

export const LabDetailsPage: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const { data: lab, isLoading: labLoading, error: labError, refetch } = useLab(labId);
  const { data: allResources = [] } = useResources();
  const { data: routePreview } = useCampusRoute(labId);
  const [showRoutePreview, setShowRoutePreview] = useState(true);

  // Interactive Date/Time selection states
  const [selectedDate, setSelectedDate] = useState(() => {
    return (
      searchParams.get('date') ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })()
    );
  });
  const [selectedStartTime, setSelectedStartTime] = useState(() => searchParams.get('startTime') || '10:00');
  const [selectedEndTime, setSelectedEndTime] = useState(() => searchParams.get('endTime') || '12:00');

  // Interactive Resource selection states
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  if (labLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (labError || !lab) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Laboratories', href: `${basePrefix}/labs` },
            { label: 'Lab Details' },
          ]}
        />
        <ErrorMessage
          title="Facility Not Found"
          message={`Unable to locate details for laboratory ${labId}.`}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Filter hardware resources assigned to this room
  const assignedResources = allResources.filter((r) => {
    const rLab = typeof r.lab === 'object' && r.lab !== null ? (r.lab as any).id : r.lab;
    return rLab === lab.id || rLab === lab.labId;
  });

  const toggleSelectResource = (resId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resId) ? prev.filter((id) => id !== resId) : [...prev, resId]
    );
  };

  const handleSelectAllResources = () => {
    if (selectedResourceIds.length === assignedResources.length) {
      setSelectedResourceIds([]);
    } else {
      setSelectedResourceIds(assignedResources.map((r) => r.id || r.resourceId));
    }
  };

  const handleProceedToBooking = () => {
    const query = new URLSearchParams();
    query.set('labId', lab.id || lab.labId);
    if (selectedDate) query.set('date', selectedDate);
    if (selectedStartTime) query.set('startTime', selectedStartTime);
    if (selectedEndTime) query.set('endTime', selectedEndTime);
    if (selectedResourceIds.length > 0) {
      query.set('resources', selectedResourceIds.join(','));
    }
    navigate(`${basePrefix}/bookings/create?${query.toString()}`);
  };

  const isAvailable = lab.operationalStatus === 'available';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center justify-between">
        <Breadcrumbs
          items={[
            { label: 'Laboratories', href: `${basePrefix}/labs` },
            { label: lab.name },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePrefix}/route/${lab.id || lab.labId}`)}
            leftIcon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
            className="text-xs"
          >
            View Route
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`${basePrefix}/labs`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs text-slate-400"
          >
            Back to Search
          </Button>
        </div>
      </div>

      {/* Main Lab Overview Card (Summary Card) */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                {lab.labId}
              </span>
              <StatusBadge status={lab.operationalStatus} size="sm" />
              {lab.maintenanceStatus && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Maintenance: {lab.maintenanceStatus}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {lab.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {lab.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`${basePrefix}/route/${lab.id || lab.labId}`)}
              leftIcon={<Compass className="w-4 h-4 text-indigo-400" />}
            >
              View Route
            </Button>
            <Button
              variant={isAvailable ? 'primary' : 'secondary'}
              onClick={handleProceedToBooking}
              disabled={lab.operationalStatus === 'offline'}
              leftIcon={<CalendarPlus className="w-4 h-4" />}
            >
              {isAvailable ? 'Book with Selected Slot' : 'Request Queue Slot'}
            </Button>
          </div>
        </div>

        {/* Lab Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Building className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Campus Building</span>
              <span className="font-semibold text-slate-200">{lab.building}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Location / Floor</span>
              <span className="font-semibold text-slate-200">{lab.location || `Floor ${lab.floor}`}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Max Capacity</span>
              <span className="font-semibold text-slate-200">{lab.capacity} Workstations</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Assigned Hardware</span>
              <span className="font-semibold text-slate-200">{assignedResources.length} items</span>
            </div>
          </div>
        </div>

        {/* Availability & Capacity Gauge */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <AvailabilityIndicator
            status={lab.operationalStatus}
            capacity={lab.capacity}
            currentOccupancy={lab.operationalStatus === 'occupied' ? Math.round(lab.capacity * 0.8) : 0}
          />
        </div>
      </div>

      {/* Target Date & Time Slot Selector */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Select Target Reservation Date & Time
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Selected: <strong className="text-indigo-400 font-mono">{selectedDate}</strong> ({selectedStartTime} - {selectedEndTime})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Reservation Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4 text-indigo-400" />}
          />

          <Input
            label="Start Time"
            type="time"
            value={selectedStartTime}
            onChange={(e) => setSelectedStartTime(e.target.value)}
          />

          <Input
            label="End Time"
            type="time"
            value={selectedEndTime}
            onChange={(e) => setSelectedEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Dedicated Resource Table with Multi-Selection */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Facility Hardware & Resource Catalog ({assignedResources.length})
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any specialized instruments or compute nodes required for your session
            </p>
          </div>

          {assignedResources.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllResources}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {selectedResourceIds.length === assignedResources.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono">
                {selectedResourceIds.length} Selected
              </span>
            </div>
          )}
        </div>

        {assignedResources.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            No external specialized hardware cataloged for this room. Workstation bench space and network access will be provided.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">Select</th>
                  <th className="p-3">Resource Name & ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Quantity / Availability</th>
                  <th className="p-3">Operational Status</th>
                  <th className="p-3">Maintenance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {assignedResources.map((res) => {
                  const isChecked = selectedResourceIds.includes(res.id || res.resourceId);
                  return (
                    <tr
                      key={res.id || res.resourceId}
                      onClick={() => toggleSelectResource(res.id || res.resourceId)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-600/10' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectResource(res.id || res.resourceId)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{res.name}</div>
                        <span className="font-mono text-[10px] text-indigo-400">{res.resourceId}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{res.description}</p>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {res.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            res.availability ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              res.availability ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          {res.availability ? '1 Ready' : 'In Use / Leased'}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={res.operationalStatus} size="sm" />
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {res.maintenanceStatus || 'Nominal'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Location & Route Preview Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Campus Location & Wayfinding Route Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {routePreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRoutePreview(!showRoutePreview)}
                className="text-xs text-indigo-400"
              >
                {showRoutePreview ? 'Hide Map Preview' : 'Show Map Preview'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePrefix}/route/${lab.id || lab.labId}`)}
              leftIcon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
              className="text-xs"
            >
              Full Interactive Route
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>Destination: {lab.name}</span>
              </div>
              <p className="text-slate-400">
                Located in <strong className="text-slate-300">{lab.building}</strong> on{' '}
                <strong className="text-slate-300">{lab.location || `Floor ${lab.floor}`}</strong>.
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Estimated travel:{' '}
                  <strong className="text-slate-200">
                    ~{routePreview?.estimatedTravelTimeMinutes || 4} mins
                  </strong>
                </span>
                <span>
                  Distance:{' '}
                  <strong className="text-slate-200">
                    {routePreview?.distanceMeters || 320} meters
                  </strong>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Route connects{' '}
              <strong className="text-emerald-400">{routePreview?.source || 'Main Gate'}</strong> to{' '}
              <strong className="text-indigo-400">{routePreview?.destination || lab.name}</strong> along optimal campus corridors.
            </p>
          </div>

          {/* Quick Route Shortcut CTA */}
          <div className="p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Ready to Reserve?
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                Lock in this bench with selected resources
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Your selections will be pre-filled into the automated scheduling wizard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleProceedToBooking}
                disabled={lab.operationalStatus === 'offline'}
                leftIcon={<CalendarPlus className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Create Booking
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`${basePrefix}/labs`)}
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto text-xs"
              >
                Browse Other Labs
              </Button>
            </div>
          </div>
        </div>

        {/* Embedded Interactive Route Preview Topology */}
        {showRoutePreview && routePreview && (
          <div className="pt-2">
            <RouteTopology
              nodes={routePreview.nodes}
              edges={routePreview.edges}
              activePath={routePreview.path}
              sourceNodeId={routePreview.path[0]}
              destinationNodeId={routePreview.path[routePreview.path.length - 1]}
              className="h-64 sm:h-72"
            />
          </div>
        )}
      </div>
    </div>
  );
};
