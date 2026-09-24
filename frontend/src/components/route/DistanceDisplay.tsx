import React from 'react';
import { Footprints, Clock } from 'lucide-react';

interface DistanceDisplayProps {
  distanceMeters: number;
  className?: string;
}

export const DistanceDisplay: React.FC<DistanceDisplayProps> = ({ distanceMeters, className = '' }) => {
  const kmFormatted = (distanceMeters / 1000).toFixed(2);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 ${className}`}>
      <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
        <Footprints className="w-4 h-4" />
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Distance</span>
        <span className="text-xs font-bold text-slate-200">
          {distanceMeters} m <span className="text-[10px] text-slate-400 font-normal">({kmFormatted} km)</span>
        </span>
      </div>
    </div>
  );
};

interface ETADisplayProps {
  minutes: number;
  className?: string;
}

export const ETADisplay: React.FC<ETADisplayProps> = ({ minutes, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 ${className}`}>
      <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
        <Clock className="w-4 h-4" />
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Walking ETA</span>
        <span className="text-xs font-bold text-slate-200">
          ~{minutes} {minutes === 1 ? 'min' : 'mins'}
        </span>
      </div>
    </div>
  );
};
