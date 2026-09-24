import React from 'react';
import { RouteResult } from '../../types';
import { DistanceDisplay, ETADisplay } from './DistanceDisplay';
import { StatusBadge } from '../common';
import { ArrowRight, Compass, CheckCircle2 } from 'lucide-react';

interface RouteSummaryProps {
  route: RouteResult;
  className?: string;
}

export const RouteSummary: React.FC<RouteSummaryProps> = ({ route, className = '' }) => {
  // Map node IDs to node names
  const nodeMap = new Map<string, string>();
  route.nodes.forEach((n) => nodeMap.set(n.id, n.name));

  const steps = route.path.map((nodeId) => nodeMap.get(nodeId) || nodeId);

  return (
    <div className={`glass-panel p-5 rounded-2xl border border-slate-800 space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase tracking-wider">
            Navigation Guidance
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">
            Path to {route.destination}
          </h3>
          <p className="text-xs text-slate-400">Starting from: {route.source}</p>
        </div>

        <div className="flex items-center gap-2">
          <DistanceDisplay distanceMeters={route.distanceMeters} />
          <ETADisplay minutes={route.estimatedTravelTimeMinutes} />
          <StatusBadge status={route.routeStatus} size="sm" />
        </div>
      </div>

      {/* Step-by-step corridor trajectory */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Step-by-Step Waypoints</span>
        </h4>

        <div className="space-y-2">
          {steps.map((stepName, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === steps.length - 1;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  isLast
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-200'
                    : isFirst
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isLast
                      ? 'bg-indigo-600 text-white'
                      : isFirst
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>

                <div className="flex-1">
                  <span className="text-xs font-medium">{stepName}</span>
                  <p className="text-[10px] text-slate-400">
                    {isFirst
                      ? 'Begin route at main entrance plaza'
                      : isLast
                      ? 'Arrive at destination facility suite'
                      : 'Follow interconnecting ped-bridge / indoor corridor'}
                  </p>
                </div>

                {!isLast && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
