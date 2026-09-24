import React, { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server, ShieldCheck, Zap } from 'lucide-react';
import { useSystemHealth } from '../../hooks';
import { getActiveDataMode } from '../../services';

interface SystemHealthIndicatorProps {
  compact?: boolean;
  className?: string;
}

export const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({
  compact = false,
  className = '',
}) => {
  const { data: health, isLoading, isError, refetch, isRefetching } = useSystemHealth(25000);
  const [showPopover, setShowPopover] = useState(false);
  const activeMode = getActiveDataMode();

  const isHealthy = !isError && health?.status === 'ok';

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPopover((prev) => !prev)}
        title="View Backend Health & Telemetry Status"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          isLoading
            ? 'bg-slate-800/60 text-slate-400 border-slate-700/60'
            : isHealthy
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 shadow-sm shadow-rose-500/10'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {isHealthy ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          )}
        </span>

        <Server className="w-3 h-3 opacity-80" />

        {compact ? (
          <span className="text-[11px] font-semibold">
            {isHealthy ? (health?.latencyMs ? `${health.latencyMs}ms` : 'API OK') : 'API ERR'}
          </span>
        ) : (
          <span className="text-[11px] font-semibold">
            {isLoading
              ? 'Checking...'
              : isHealthy
              ? `API ${health?.latencyMs ? `(${health.latencyMs}ms)` : 'Healthy'}`
              : 'API Offline'}
          </span>
        )}
      </button>

      {/* Health Details Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-200">Backend System Telemetry</h4>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                disabled={isRefetching}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint</span>
                <span className="font-mono text-[10px] text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  GET /api/v1/health
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1">
                  {isHealthy ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold uppercase text-[11px]">
                        {health?.status || 'Online'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-rose-400 font-semibold uppercase text-[11px]">Unreachable</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Mode</span>
                <span className="capitalize font-medium text-slate-200">{activeMode} Mode</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Environment</span>
                <span className="font-mono text-[11px] text-slate-300">{health?.environment || 'unknown'}</span>
              </div>

              {health?.latencyMs !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Roundtrip Ping</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {health.latencyMs} ms
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Heartbeat Time</span>
                <span className="text-[10px] text-slate-500">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Direct telemetry from backend core health probe.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
