import React from 'react';
import { Check, Clock, AlertCircle, AlertTriangle, HelpCircle, Layers } from 'lucide-react';
import { BookingStatus } from '../../types';

interface BookingStatusTrackerProps {
  status: BookingStatus;
  className?: string;
}

export const BookingStatusTracker: React.FC<BookingStatusTrackerProps> = ({
  status,
  className = '',
}) => {
  const normalized = (status || '').toUpperCase();

  // Core progression pipeline requested by specification
  const standardPipeline = [
    { key: 'REQUESTED', label: 'Requested', aliases: ['DRAFT', 'REQUESTED'] },
    { key: 'VALIDATED', label: 'Validated', aliases: ['PENDING', 'VALIDATED'] },
    { key: 'QUEUED', label: 'Queued', aliases: ['QUEUED'] },
    { key: 'LEASED', label: 'Leased', aliases: ['LEASED'] },
    { key: 'CONFIRMED', label: 'Confirmed', aliases: ['CONFIRMED'] },
    { key: 'ACTIVE', label: 'Active', aliases: ['ACTIVE'] },
    { key: 'COMPLETED', label: 'Completed', aliases: ['COMPLETED'] },
  ];

  // Alternative states
  const isWaitlisted = normalized === 'WAITLISTED';
  const isCancelled = normalized === 'CANCELLED';
  const isRejected = normalized === 'REJECTED';
  const isExpired = normalized === 'EXPIRED';
  const isKnownAlternative = isWaitlisted || isCancelled || isRejected || isExpired;

  // Check if status matches standard pipeline
  const currentIndex = standardPipeline.findIndex((step) =>
    step.aliases.includes(normalized)
  );

  const isDynamicCustomStatus = currentIndex === -1 && !isKnownAlternative;

  return (
    <div className={`w-full py-4 px-2 sm:px-4 ${className}`}>
      {/* State 1: Known Alternative - Waitlisted */}
      {isWaitlisted && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wider text-amber-200">
              Status: WAITLISTED
            </span>
            <p className="text-amber-300/80 mt-0.5">
              This reservation has been placed on the campus priority waitlist pending bench availability.
            </p>
          </div>
        </div>
      )}

      {/* State 2: Known Alternative - Cancelled, Rejected, Expired */}
      {(isCancelled || isRejected || isExpired) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wider text-rose-200">
              Status: {normalized}
            </span>
            <p className="text-rose-200/80 mt-0.5">
              {isCancelled && 'This reservation was voluntarily cancelled and all workstation hardware released.'}
              {isRejected && 'This reservation request was declined due to scheduling or hardware conflicts.'}
              {isExpired && 'The reservation window expired prior to user facility check-in.'}
            </p>
          </div>
        </div>
      )}

      {/* State 3: Dynamic Unknown Backend Status */}
      {isDynamicCustomStatus && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-slate-200 animate-in fade-in">
          <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-indigo-300 font-mono">
                {normalized}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                Backend Custom State
              </span>
            </div>
            <p className="text-slate-400 mt-1">
              Active facility operational state provided directly by scheduling engine.
            </p>
          </div>
        </div>
      )}

      {/* State 4: Standard Lifecycle Progress Pipeline */}
      {currentIndex !== -1 && (
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          {/* Active progress bar */}
          <div
            className="absolute top-4 left-4 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{
              width: `${(currentIndex / (standardPipeline.length - 1)) * 100}%`,
            }}
          />

          <div className="relative z-10 flex justify-between items-center">
            {standardPipeline.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              let nodeClasses = 'border-slate-800 bg-slate-900 text-slate-500';
              if (isPast) {
                nodeClasses = 'border-indigo-500 bg-indigo-600 text-white';
              } else if (isCurrent) {
                nodeClasses =
                  'border-indigo-400 bg-slate-950 text-indigo-400 ring-4 ring-indigo-500/20';
              }

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${nodeClasses}`}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 animate-spin-slow" />
                    ) : (
                      <span className="text-[10px] font-semibold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs mt-1.5 font-medium whitespace-nowrap hidden sm:block ${
                      isCurrent
                        ? 'text-indigo-300 font-bold'
                        : isPast
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
