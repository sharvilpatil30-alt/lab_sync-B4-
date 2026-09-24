import React from 'react';
import { Layers, Clock, Users, ArrowUpRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Booking } from '../../types';

interface QueueStatusProps {
  booking: Booking;
  className?: string;
}

export const QueueStatus: React.FC<QueueStatusProps> = ({ booking, className = '' }) => {
  const normalized = (booking.status || '').toUpperCase();
  const isQueued = normalized === 'QUEUED';
  const isConfirmed = normalized === 'CONFIRMED' || normalized === 'ACTIVE';
  const isRejected = normalized === 'REJECTED';
  const isCancelled = normalized === 'CANCELLED';
  const isWaitlisted = normalized === 'WAITLISTED';

  const estimatedTimeFormatted = booking.estimatedStart
    ? new Date(booking.estimatedStart).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : isConfirmed
    ? 'Immediate Access'
    : 'Pending Allocation';

  // Scheduling State label
  const schedulingState = isQueued
    ? 'PRIORITY_HOLD'
    : isWaitlisted
    ? 'WAITLIST_BUFFER'
    : isConfirmed
    ? 'BENCH_LEASED'
    : isRejected
    ? 'REJECTED_CONFLICT'
    : isCancelled
    ? 'RELEASED_CANCELLED'
    : normalized;

  // Scheduling Explanation
  let explanation = '';
  if (isQueued) {
    explanation =
      'High facility demand detected. Your reservation is securely held in the scheduling priority queue and will be automatically promoted when a workstation bench becomes available.';
  } else if (isWaitlisted) {
    explanation =
      'Placed on campus waitlist buffer. You will receive notification as soon as slot capacity opens.';
  } else if (isConfirmed) {
    explanation =
      'Automated scheduling engine has allocated dedicated workstation resources and generated campus access clearance.';
  } else if (isRejected) {
    explanation =
      booking.cancellationReason ||
      'Resource or concurrent workstation capacity conflict prevented automated approval.';
  } else if (isCancelled) {
    explanation =
      booking.cancellationReason ||
      'Voluntarily cancelled by user. Workstation seats and hardware items released back to the general campus pool.';
  } else {
    explanation = `Currently in ${normalized} phase under automated campus scheduling rules.`;
  }

  const borderClass = isQueued || isWaitlisted
    ? 'border-amber-500/30 bg-amber-950/15'
    : isConfirmed
    ? 'border-emerald-500/30 bg-emerald-950/15'
    : isRejected || isCancelled
    ? 'border-rose-500/30 bg-rose-950/15'
    : 'border-slate-800 bg-slate-900/60';

  return (
    <div className={`glass-card p-5 rounded-2xl border ${borderClass} space-y-4 shadow-xl ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers
            className={`w-4 h-4 ${
              isQueued || isWaitlisted
                ? 'text-amber-400'
                : isConfirmed
                ? 'text-emerald-400'
                : isRejected || isCancelled
                ? 'text-rose-400'
                : 'text-indigo-400'
            }`}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Scheduling & Queue Engine
          </h4>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono ${
            isQueued || isWaitlisted
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : isConfirmed
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : isRejected || isCancelled
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {schedulingState}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
            Queue Position
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
            <span
              className={
                isQueued || isWaitlisted
                  ? 'text-amber-400'
                  : isConfirmed
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }
            >
              #{booking.queuePosition ?? (isConfirmed ? 0 : '-')}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
            Requests Ahead
          </span>
          <span className="font-semibold text-slate-200 text-sm">
            {booking.requestsAhead ?? 0} request{(booking.requestsAhead ?? 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
            Estimated Start Time
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-sm">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono text-xs">{estimatedTimeFormatted}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
            Scheduling Policy
          </span>
          <div className="flex items-center gap-1 text-slate-300 text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              {booking.userRole === 'faculty' ? 'Faculty Priority Queue' : 'FIFO Dynamic Hold'}
            </span>
          </div>
        </div>
      </div>

      {/* Scheduling Explanation Block */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Scheduling State Explanation
            </span>
            <p className="text-slate-300 leading-relaxed mt-0.5">{explanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
