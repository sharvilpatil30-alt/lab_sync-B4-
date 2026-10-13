import type { LabMapEntry } from '../../services/cseRouting';
import React, { useState } from 'react';
import {
  CampusBuilding,
  CampusNode,

} from '../../data/campusMapData';
import { CalculatedRoute } from '../../services/routeEngine';
import { LocationMode } from '../../services/locationProvider';
import { Button, StatusBadge } from '../common';
import {
  Compass,
  MapPin,
  Clock,
  Footprints,
  Play,
  Pause,
  Square,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  RotateCcw,
  Sparkles,
  Search,
  Building,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface NavigationPanelProps {
  buildings: CampusBuilding[];
  labs: Record<string, LabMapEntry>;
  route: CalculatedRoute | null;
  selectedDestinationNodeId?: string;
  onSelectDestination: (nodeId: string) => void;
  isNavigating: boolean;
  navProgress: number; // 0.0 to 1.0
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onPauseResumeNavigation: () => void;
  isPaused: boolean;
  navSpeed: number; // 1, 2, or 4
  onSetNavSpeed: (speed: number) => void;
  locationMode: LocationMode;
  onToggleLocationMode: () => void;
  hasArrived: boolean;
  onResetArrival: () => void;
  className?: string;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  route,
  buildings: campusBuildings,
  labs: labDestinationMap,
  selectedDestinationNodeId,
  onSelectDestination,
  isNavigating,
  navProgress,
  onStartNavigation,
  onStopNavigation,
  onPauseResumeNavigation,
  isPaused,
  navSpeed,
  onSetNavSpeed,
  locationMode,
  onToggleLocationMode,
  hasArrived,
  onResetArrival,
  className = '',
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'labs' | 'buildings'>('labs');
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Filtered labs list
  const labEntries = Object.entries(labDestinationMap).filter(([_, info]) => {
    const q = searchFilter.toLowerCase();
    return (
      info.displayName.toLowerCase().includes(q) ||
      info.department.toLowerCase().includes(q) ||
      info.room.toLowerCase().includes(q)
    );
  });

  // Filtered buildings list
  const buildingEntries = campusBuildings.filter((b) => {
    const q = searchFilter.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.shortName.toLowerCase().includes(q) ||
      b.department.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q)
    );
  });

  const remainingMeters = route
    ? Math.max(0, Math.round(route.totalDistanceMeters * (1 - navProgress)))
    : 0;
  const remainingMinutes = Math.max(
    remainingMeters > 0 ? 1 : 0,
    Math.ceil(remainingMeters / 80)
  );
  const progressPercent = Math.min(100, Math.round(navProgress * 100));

  return (
    <div className={`flex flex-col bg-white border border-[#D9E2EC] rounded-2xl shadow-lg p-5 space-y-5 text-left ${className}`}>
      {/* 1. Official RIT College Branding Header */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#D9E2EC]">
        <div className="flex items-center gap-3">
          {/* Official RIT Logo Image */}
          <div className="h-10 w-24 flex items-center justify-center overflow-hidden rounded-lg bg-white border border-[#D9E2EC] p-1 shrink-0">
            <img
              src="/RIT.png"
              alt="RIT Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#0B1F3A] tracking-tight">RIT</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                Wayfinding
              </span>
            </div>
            <p className="text-[10px] text-[#627D98] font-medium leading-tight mt-0.5">
              Rajarambapu Institute of Technology
            </p>
          </div>
        </div>

        {/* Location Mode Toggle Pill */}
        <button
          onClick={onToggleLocationMode}
          title="Click to toggle between Demo Simulation and Device GPS"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
            locationMode === 'real-gps'
              ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0] hover:bg-[#D1FAE5]'
              : 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] hover:bg-[#DBEAFE]'
          }`}
        >
          <Navigation className="w-3 h-3" />
          <span className="uppercase">{locationMode === 'real-gps' ? 'Device GPS' : 'Demo Mode'}</span>
        </button>
      </div>

      {/* 2. Arrival State Banner */}
      {hasArrived && (
        <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
            <h4 className="text-sm font-bold">You Have Arrived at Destination!</h4>
          </div>
          <p className="text-xs text-[#15803D]/90 leading-relaxed">
            Welcome to <strong className="font-semibold text-[#0B1F3A]">{route?.destinationName}</strong>.
            {route?.destinationRoom && ` Proceed to ${route.destinationRoom} on ${route.destinationFloor}.`}
          </p>
          <div className="pt-1 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onResetArrival} className="text-xs h-8">
              Close Notice
            </Button>
          </div>
        </div>
      )}

      {/* 3. Destination Selector (when not actively navigating) */}
      {!isNavigating && !hasArrived && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Select Destination</span>
            </label>

            {/* Category tabs */}
            <div className="inline-flex rounded-lg bg-[#F0F4F8] p-0.5 border border-[#D9E2EC] text-[10px] font-semibold">
              <button
                onClick={() => setActiveTab('labs')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  activeTab === 'labs'
                    ? 'bg-white text-[#0B1F3A] shadow-2xs font-bold'
                    : 'text-[#627D98] hover:text-[#0B1F3A]'
                }`}
              >
                Labs ({Object.keys(labDestinationMap).length})
              </button>
              <button
                onClick={() => setActiveTab('buildings')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  activeTab === 'buildings'
                    ? 'bg-white text-[#0B1F3A] shadow-2xs font-bold'
                    : 'text-[#627D98] hover:text-[#0B1F3A]'
                }`}
              >
                Campus Buildings ({campusBuildings.length})
              </button>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'labs' ? 'laboratories or equipment...' : 'academic buildings...'}`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-lg text-xs text-[#102A43] placeholder-[#829AB1] pl-8 pr-3 py-2 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            />
          </div>

          {/* Destination Cards List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-[#D9E2EC]/50 pr-1">
            {activeTab === 'labs' ? (
              labEntries.length === 0 ? (
                <p className="text-xs text-[#627D98] text-center py-4">No matching laboratories found</p>
              ) : (
                labEntries.map(([labId, lab]) => {
                  const isSelected = selectedDestinationNodeId === lab.nodeId;
                  return (
                    <div
                      key={labId}
                      onClick={() => onSelectDestination(lab.nodeId)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B1F3A]'
                          : 'hover:bg-[#F8FAFC] border border-transparent text-[#102A43]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0B1F3A] truncate">{lab.displayName}</p>
                        <p className="text-[11px] text-[#627D98] truncate">
                          {lab.department} • {lab.room} ({lab.floor})
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          isSelected
                            ? 'bg-[#0B1F3A] text-white'
                            : 'bg-[#F0F4F8] text-[#163A63] border border-[#D9E2EC]'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Route'}
                      </span>
                    </div>
                  );
                })
              )
            ) : buildingEntries.length === 0 ? (
              <p className="text-xs text-[#627D98] text-center py-4">No matching buildings found</p>
            ) : (
              buildingEntries.map((bld) => {
                const isSelected = selectedDestinationNodeId === bld.entranceNodeId;
                return (
                  <div
                    key={bld.id}
                    onClick={() => onSelectDestination(bld.entranceNodeId)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B1F3A]'
                        : 'hover:bg-[#F8FAFC] border border-transparent text-[#102A43]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-[#EFF6FF] text-[#2563EB]">
                          {bld.code}
                        </span>
                        <p className="text-xs font-bold text-[#0B1F3A] truncate">{bld.name}</p>
                      </div>
                      <p className="text-[11px] text-[#627D98] truncate">{bld.department}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        isSelected
                          ? 'bg-[#0B1F3A] text-white'
                          : 'bg-[#F0F4F8] text-[#163A63] border border-[#D9E2EC]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Route'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Active Route Telemetry & Progress Card */}
      {route ? (
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E2EC] space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-[#2563EB] font-bold uppercase tracking-wider block">
                {isNavigating ? 'Navigating to Destination' : route.shortestDistanceGuaranteed ? 'Calculated Optimal Route' : 'Calculated Route'}
              </span>
              <h4 className="text-sm font-bold text-[#0B1F3A] mt-0.5">
                {route.destinationName}
              </h4>
              <p className="text-[11px] text-[#627D98]">Starting from {route.sourceName}</p>
            </div>
            <StatusBadge status={isNavigating ? 'IN-PROGRESS' : route.shortestDistanceGuaranteed ? 'OPTIMAL' : 'ALTERNATIVE'} size="sm" />
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-white border border-[#D9E2EC] text-center">
              <span className="text-[10px] text-[#627D98] uppercase block font-medium">Distance</span>
              <span className="text-xs font-extrabold text-[#0B1F3A]">
                {isNavigating ? `${remainingMeters} m` : `${route.totalDistanceMeters} m`}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#D9E2EC] text-center">
              <span className="text-[10px] text-[#627D98] uppercase block font-medium">ETA</span>
              <span className="text-xs font-extrabold text-[#0B1F3A]">
                ~{isNavigating ? remainingMinutes : route.estimatedMinutes} min
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#D9E2EC] text-center">
              <span className="text-[10px] text-[#627D98] uppercase block font-medium">Progress</span>
              <span className="text-xs font-extrabold text-[#2563EB]">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Progress Bar (when navigating) */}
          {isNavigating && (
            <div className="space-y-1">
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#2563EB] h-full transition-all duration-100 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#627D98]">
                <span>Departed</span>
                <span>{progressPercent}% complete</span>
                <span>Destination</span>
              </div>
            </div>
          )}

          {/* Turn-by-Turn Waypoint Drawer Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAllSteps(!showAllSteps)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#163A63] hover:text-[#0B1F3A] transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Turn-by-Turn Route Steps ({route.instructions.length})</span>
              </span>
              <span className="text-[11px] text-[#2563EB]">{showAllSteps ? 'Hide' : 'View'}</span>
            </button>

            {showAllSteps && (
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 border-t border-[#D9E2EC] pt-2 text-xs">
                {route.instructions.map((inst) => (
                  <div
                    key={inst.step}
                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white text-[11px] text-[#102A43]"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {inst.step}
                    </span>
                    <span className="flex-1 leading-snug">{inst.instruction}</span>
                    {inst.distanceMeters > 0 && (
                      <span className="text-[10px] text-[#627D98] font-mono shrink-0">
                        {inst.distanceMeters}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-xl bg-[#F8FAFC] border border-dashed border-[#D9E2EC] text-xs text-[#627D98] space-y-2">
          <Compass className="w-8 h-8 text-[#BCCCDC] mx-auto" />
          <p className="font-medium text-[#102A43]">Select a destination to calculate route</p>
          <p className="text-[11px] text-[#627D98]">
            Click any campus laboratory or academic building on the 2D map or choose from the list above.
          </p>
        </div>
      )}

      {/* 5. Navigation Control Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {!isNavigating ? (
          <Button
            variant="primary"
            className="w-full h-11 text-sm font-semibold shadow-sm"
            onClick={onStartNavigation}
            disabled={!route}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Start Live Navigation
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant={isPaused ? 'primary' : 'secondary'}
                className="flex-1 h-10 text-xs font-semibold"
                onClick={onPauseResumeNavigation}
                leftIcon={isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              >
                {isPaused ? 'Resume Walk' : 'Pause'}
              </Button>
              <Button
                variant="danger"
                className="flex-1 h-10 text-xs font-semibold"
                onClick={onStopNavigation}
                leftIcon={<Square className="w-3.5 h-3.5" />}
              >
                End Navigation
              </Button>
            </div>

            {/* Simulation Speed Switcher */}
            <div className="flex items-center justify-between text-[11px] text-[#627D98] px-1 pt-1">
              <span>Simulation Speed:</span>
              <div className="inline-flex rounded-lg bg-[#F0F4F8] p-0.5 border border-[#D9E2EC]">
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onSetNavSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      navSpeed === spd
                        ? 'bg-white text-[#0B1F3A] shadow-2xs'
                        : 'text-[#627D98] hover:text-[#0B1F3A]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
