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
            ? 'bg-[#F0F4F8] text-[#627D98] border-[#D9E2EC]'
            : isHealthy
            ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0] hover:bg-[#D1FAE5]'
            : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {isHealthy ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#15803D]" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]" />
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
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-[#D9E2EC] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-left text-[#102A43]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2563EB]" />
                <h4 className="text-xs font-bold text-[#0B1F3A]">Backend System Telemetry</h4>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                disabled={isRefetching}
                className="p-1 rounded-md text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8] transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-[#2563EB]' : ''}`} />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#627D98]">Endpoint</span>
                <span className="font-mono text-[10px] text-[#163A63] font-semibold px-1.5 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE]">
                  GET /api/v1/health
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#627D98]">Status</span>
                <span className="flex items-center gap-1">
                  {isHealthy ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                      <span className="text-[#15803D] font-semibold uppercase text-[11px]">
                        {health?.status || 'Online'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span className="text-[#DC2626] font-semibold uppercase text-[11px]">Unreachable</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#627D98]">Active Mode</span>
                <span className="capitalize font-medium text-[#0B1F3A]">{activeMode} Mode</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#627D98]">Environment</span>
                <span className="font-mono text-[11px] text-[#102A43]">{health?.environment || 'unknown'}</span>
              </div>

              {health?.latencyMs !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[#627D98]">Roundtrip Ping</span>
                  <span className="font-mono text-[11px] text-[#15803D] font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {health.latencyMs} ms
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[#627D98]">Heartbeat Time</span>
                <span className="text-[10px] text-[#627D98]">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D9E2EC] text-[10px] text-[#627D98] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span>Direct telemetry from backend core health probe.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
