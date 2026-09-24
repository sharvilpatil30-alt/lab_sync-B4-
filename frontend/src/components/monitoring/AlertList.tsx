import React from 'react';
import { Alert } from '../../types';
import { AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { Button } from '../common';

interface AlertListProps {
  alerts: Alert[];
  onResolve?: (alertId: string) => void;
  className?: string;
}

export const AlertList: React.FC<AlertListProps> = ({ alerts, onResolve, className = '' }) => {
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className={`glass-panel p-5 rounded-xl border border-slate-800 space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Active System Alerts
          </h4>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          {unresolvedAlerts.length} active
        </span>
      </div>

      <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto space-y-1">
        {unresolvedAlerts.length === 0 ? (
          <div className="py-8 text-center text-slate-400 flex flex-col items-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-xs font-medium text-slate-300">All Systems Nominal</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No critical warnings or hardware alerts.</p>
          </div>
        ) : (
          unresolvedAlerts.map((alert) => {
            const severityStyles = {
              critical: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
              high: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
              medium: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
              low: 'bg-slate-800/80 border-slate-700/60 text-slate-300',
            }[alert.severity];

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${severityStyles}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-900/60 font-mono">
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-snug">{alert.message}</p>
                </div>

                {onResolve && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResolve(alert.id)}
                    className="shrink-0 text-xs px-2 py-1"
                    title="Acknowledge & Resolve Alert"
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
