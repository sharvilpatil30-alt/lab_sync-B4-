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

  let colorClasses = 'bg-[#F0F4F8] text-[#627D98] border-[#D9E2EC]';
  let dotColor = 'bg-[#627D98]';

  switch (normalized) {
    // Available / Confirmed / Completed / Resolved / Active / Optimal
    case 'AVAILABLE':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'OPTIMAL':
      colorClasses = 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]';
      dotColor = 'bg-[#15803D]';
      break;

    // In Progress / Leased / Occupied / In-use
    case 'OCCUPIED':
    case 'IN-USE':
    case 'LEASED':
    case 'IN-PROGRESS':
      colorClasses = 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
      dotColor = 'bg-[#2563EB]';
      break;

    // Queued / Pending / Scheduled / Alternative / Waitlisted
    case 'QUEUED':
    case 'PENDING':
    case 'SCHEDULED':
    case 'WAITLISTED':
    case 'ALTERNATIVE':
      colorClasses = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      dotColor = 'bg-[#D97706] animate-pulse';
      break;

    // Maintenance / Warning / Degraded
    case 'MAINTENANCE':
    case 'DEGRADED':
      colorClasses = 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]';
      dotColor = 'bg-[#EA580C]';
      break;

    // Offline / Cancelled / Rejected / Expired / Critical
    case 'OFFLINE':
    case 'CANCELLED':
    case 'REJECTED':
    case 'EXPIRED':
    case 'UNAVAILABLE':
    case 'CRITICAL':
      colorClasses = 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';
      dotColor = 'bg-[#DC2626]';
      break;

    default:
      colorClasses = 'bg-[#F0F4F8] text-[#627D98] border-[#D9E2EC]';
      dotColor = 'bg-[#627D98]';
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
