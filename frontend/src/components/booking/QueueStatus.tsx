import React from 'react';
import { Layers, Clock, Users, ArrowUpRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Booking } from '../../types';
import { useTheme } from '../../hooks';

interface QueueStatusProps {
  booking: Booking;
  className?: string;
}

export const QueueStatus: React.FC<QueueStatusProps> = ({ booking, className = '' }) => {
  const { isGoldPink } = useTheme();
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

  const borderClass = isGoldPink
    ? isQueued || isWaitlisted
      ? 'border-amber-300 bg-gradient-to-br from-amber-50/95 to-amber-100/70 text-slate-800 shadow-md shadow-amber-500/10'
      : isConfirmed
      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/95 to-emerald-100/70 text-slate-800 shadow-md shadow-emerald-500/10'
      : isRejected || isCancelled
      ? 'border-rose-300 bg-gradient-to-br from-rose-50/95 to-rose-100/70 text-slate-800 shadow-md shadow-rose-500/10'
      : 'border-pink-200/90 bg-white/95 text-slate-800 shadow-md'
    : isQueued || isWaitlisted
    ? 'border-amber-500/30 bg-amber-950/15'
    : isConfirmed
    ? 'border-emerald-500/30 bg-emerald-950/15'
    : isRejected || isCancelled
    ? 'border-rose-500/30 bg-rose-950/15'
    : 'border-slate-800 bg-slate-900/60';

  return (
    <div className={`glass-card p-5 rounded-2xl border ${borderClass} space-y-4 shadow-xl ${className}`}>
      <div className={`flex items-center justify-between pb-3 border-b ${isGoldPink ? 'border-pink-200/70' : 'border-slate-800/80'}`}>
        <div className="flex items-center gap-2">
          <Layers
            className={`w-4 h-4 ${
              isQueued || isWaitlisted
                ? isGoldPink ? 'text-amber-600' : 'text-amber-400'
                : isConfirmed
                ? isGoldPink ? 'text-emerald-600' : 'text-emerald-400'
                : isRejected || isCancelled
                ? isGoldPink ? 'text-rose-600' : 'text-rose-400'
                : isGoldPink ? 'text-pink-600' : 'text-indigo-400'
            }`}
          />
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isGoldPink ? 'text-slate-800' : 'text-slate-200'}`}>
            Scheduling & Queue Engine
          </h4>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono ${
            isQueued || isWaitlisted
              ? isGoldPink
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : isConfirmed
              ? isGoldPink
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : isRejected || isCancelled
              ? isGoldPink
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : isGoldPink
              ? 'bg-pink-100 text-pink-800 border-pink-200'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {schedulingState}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${isGoldPink ? 'text-slate-500' : 'text-slate-500'}`}>
            Queue Position
          </span>
          <div className={`flex items-center gap-1.5 font-bold text-sm ${isGoldPink ? 'text-slate-900' : 'text-slate-100'}`}>
            <span
              className={
                isQueued || isWaitlisted
                  ? isGoldPink ? 'text-amber-700' : 'text-amber-400'
                  : isConfirmed
                  ? isGoldPink ? 'text-emerald-700' : 'text-emerald-400'
                  : isGoldPink ? 'text-slate-500' : 'text-slate-400'
              }
            >
              #{booking.queuePosition ?? (isConfirmed ? 0 : '-')}
            </span>
          </div>
        </div>

        <div>
          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${isGoldPink ? 'text-slate-500' : 'text-slate-500'}`}>
            Requests Ahead
          </span>
          <span className={`font-semibold text-sm ${isGoldPink ? 'text-slate-800' : 'text-slate-200'}`}>
            {booking.requestsAhead ?? 0} request{(booking.requestsAhead ?? 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div>
          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${isGoldPink ? 'text-slate-500' : 'text-slate-500'}`}>
            Estimated Start Time
          </span>
          <div className={`flex items-center gap-1.5 font-semibold text-sm ${isGoldPink ? 'text-slate-800' : 'text-slate-200'}`}>
            <Clock className={`w-3.5 h-3.5 shrink-0 ${isGoldPink ? 'text-pink-600' : 'text-indigo-400'}`} />
            <span className="font-mono text-xs">{estimatedTimeFormatted}</span>
          </div>
        </div>

        <div>
          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${isGoldPink ? 'text-slate-500' : 'text-slate-500'}`}>
            Scheduling Policy
          </span>
          <div className={`flex items-center gap-1 text-xs font-medium ${isGoldPink ? 'text-slate-700' : 'text-slate-300'}`}>
            <Users className={`w-3.5 h-3.5 shrink-0 ${isGoldPink ? 'text-pink-600' : 'text-indigo-400'}`} />
            <span className="truncate">
              {booking.userRole === 'faculty' ? 'Faculty Priority Queue' : 'FIFO Dynamic Hold'}
            </span>
          </div>
        </div>
      </div>

      {/* Scheduling Explanation Block */}
      <div className={`pt-3 border-t ${isGoldPink ? 'border-pink-200/70' : 'border-slate-800/80'}`}>
        <div className="flex items-start gap-2 text-xs">
          <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isGoldPink ? 'text-pink-600' : 'text-indigo-400'}`} />
          <div>
            <span className={`text-[10px] uppercase font-semibold block ${isGoldPink ? 'text-slate-500' : 'text-slate-400'}`}>
              Scheduling State Explanation
            </span>
            <p className={`leading-relaxed mt-0.5 ${isGoldPink ? 'text-slate-700' : 'text-slate-300'}`}>{explanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
