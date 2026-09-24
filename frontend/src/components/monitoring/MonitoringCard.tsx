import React from 'react';

interface MonitoringCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue';
  className?: string;
}

export const MonitoringCard: React.FC<MonitoringCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'indigo',
  className = '',
}) => {
  const colorStyles = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[color];

  return (
    <div className={`glass-card p-5 rounded-xl border border-slate-800/80 shadow-lg relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {value}
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorStyles}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs">
          <span className={trend.isPositive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {trend.value}
          </span>
          <span className="text-slate-500">vs last hour</span>
        </div>
      )}
    </div>
  );
};
