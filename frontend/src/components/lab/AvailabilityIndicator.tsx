import React from 'react';
import { LabOperationalStatus } from '../../types';

interface AvailabilityIndicatorProps {
  status: LabOperationalStatus;
  capacity?: number;
  currentOccupancy?: number;
  showBar?: boolean;
}

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  status,
  capacity = 40,
  currentOccupancy = 0,
  showBar = true,
}) => {
  const percentage = Math.min(100, Math.round((currentOccupancy / capacity) * 100));

  const getStatusColor = () => {
    switch (status) {
      case 'available':
        return 'text-emerald-400 bg-emerald-500';
      case 'occupied':
        return 'text-amber-400 bg-amber-500';
      case 'maintenance':
        return 'text-orange-400 bg-orange-500';
      case 'offline':
        return 'text-rose-400 bg-rose-500';
      default:
        return 'text-slate-400 bg-slate-500';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Occupancy</span>
        <span className="text-slate-200 font-semibold">
          {currentOccupancy} / {capacity} seats ({percentage}%)
        </span>
      </div>

      {showBar && (
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusColor.split(' ')[1]}`}
            style={{ width: `${Math.max(5, percentage)}%` }}
          />
        </div>
      )}
    </div>
  );
};
