import React from 'react';
import { MonitoringOverview } from '../../types';

interface StatusOverviewProps {
  overview: MonitoringOverview;
  className?: string;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({ overview, className = '' }) => {
  const labTotal = overview.totalLabs || 1;
  const availPercent = Math.round((overview.availableLabs / labTotal) * 100);
  const occPercent = Math.round((overview.occupiedLabs / labTotal) * 100);
  const maintPercent = Math.round((overview.maintenanceLabs / labTotal) * 100);

  const resTotal = overview.totalResources || 1;
  const resAvailPercent = Math.round((overview.availableResources / resTotal) * 100);

  return (
    <div className={`glass-panel p-5 rounded-xl border border-slate-800 space-y-4 ${className}`}>
      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
        Operational Capacity Overview
      </h3>

      {/* Lab distribution bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Campus Labs Allocation</span>
          <span className="text-slate-200 font-semibold">{overview.totalLabs} facilities</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
          <div
            title={`Available: ${overview.availableLabs}`}
            style={{ width: `${availPercent}%` }}
            className="bg-emerald-500 h-full transition-all"
          />
          <div
            title={`Occupied: ${overview.occupiedLabs}`}
            style={{ width: `${occPercent}%` }}
            className="bg-amber-500 h-full transition-all"
          />
          <div
            title={`Maintenance: ${overview.maintenanceLabs}`}
            style={{ width: `${maintPercent}%` }}
            className="bg-orange-500 h-full transition-all"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Available ({availPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>Occupied ({occPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
            <span>Maintenance ({maintPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Equipment allocation */}
      <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Hardware Equipment Allocation</span>
          <span className="text-slate-200 font-semibold">
            {overview.availableResources} / {overview.totalResources} available ({resAvailPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${resAvailPercent}%` }}
            className="bg-indigo-500 h-full transition-all"
          />
        </div>
      </div>
    </div>
  );
};
