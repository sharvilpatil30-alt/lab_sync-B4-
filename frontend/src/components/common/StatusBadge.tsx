import React from 'react';
import { BookingStatus, LabOperationalStatus, ResourceOperationalStatus, MaintenanceStatus } from '../../types';

type AnyStatus = BookingStatus | LabOperationalStatus | ResourceOperationalStatus | MaintenanceStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showDot = true,
}) => {
  const normalized = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  switch (normalized) {
    // Available / Confirmed / Completed / Resolved / Active
    case 'AVAILABLE':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'OPTIMAL':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-400';
      break;

    // In Progress / Leased / Occupied / In-use
    case 'OCCUPIED':
    case 'IN-USE':
    case 'LEASED':
    case 'IN-PROGRESS':
      colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      dotColor = 'bg-blue-400';
      break;

    // Queued / Pending / Scheduled / Alternative
    case 'QUEUED':
    case 'PENDING':
    case 'SCHEDULED':
    case 'WAITLISTED':
    case 'ALTERNATIVE':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      dotColor = 'bg-amber-400 animate-pulse';
      break;

    // Maintenance / Warning / Degraded
    case 'MAINTENANCE':
    case 'DEGRADED':
      colorClasses = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      dotColor = 'bg-orange-400';
      break;

    // Offline / Cancelled / Rejected / Expired / Critical
    case 'OFFLINE':
    case 'CANCELLED':
    case 'REJECTED':
    case 'EXPIRED':
    case 'UNAVAILABLE':
    case 'CRITICAL':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      dotColor = 'bg-rose-400';
      break;

    default:
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
      dotColor = 'bg-slate-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span>{normalized}</span>
    </span>
  );
};
