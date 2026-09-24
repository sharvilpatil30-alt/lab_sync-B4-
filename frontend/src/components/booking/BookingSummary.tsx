import React from 'react';
import { Calendar, Clock, MapPin, Building, User, FileText, CheckCircle2 } from 'lucide-react';
import { Booking, Lab } from '../../types';
import { StatusBadge } from '../common';

interface BookingSummaryProps {
  booking: Booking;
  lab?: Lab;
  className?: string;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({ booking, lab, className = '' }) => {
  const labName = lab?.name || (typeof booking.lab === 'object' && booking.lab !== null ? (booking.lab as any).name : 'Lab Room');
  const labId = lab?.labId || (typeof booking.lab === 'object' && booking.lab !== null ? (booking.lab as any).labId : booking.lab);
  const building = lab?.building || 'Academic Complex';
  const floor = lab?.floor !== undefined ? `Floor ${lab.floor}` : '';

  return (
    <div className={`glass-panel p-5 rounded-xl border border-slate-800 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-mono text-indigo-400 font-semibold tracking-wider">
            {booking.bookingId}
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">{labName}</h3>
          <p className="text-xs text-slate-400">{labId}</p>
        </div>
        <StatusBadge status={booking.status} size="md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Date</span>
            <span className="font-medium text-slate-200">{booking.date}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Time Window</span>
            <span className="font-medium text-slate-200">
              {booking.startTime} - {booking.endTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <Building className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Location</span>
            <span className="font-medium text-slate-200 truncate">
              {building} {floor ? `• ${floor}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <User className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Booked For</span>
            <span className="font-medium text-slate-200 capitalize">Role: {booking.userRole}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-start gap-2 text-xs">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Purpose</span>
            <p className="text-slate-300 leading-relaxed mt-0.5">{booking.purpose}</p>
          </div>
        </div>
      </div>

      {booking.cancellationReason && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <span className="font-bold">Cancellation Reason: </span>
          <span>{booking.cancellationReason}</span>
        </div>
      )}
    </div>
  );
};
