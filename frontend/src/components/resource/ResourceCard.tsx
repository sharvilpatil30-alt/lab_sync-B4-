import React from 'react';
import { Cpu, MapPin, Wrench, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Resource } from '../../types';
import { StatusBadge, Button } from '../common';
import { useNavigate } from 'react-router-dom';

interface ResourceCardProps {
  resource: Resource;
  onStatusChange?: (resource: Resource, newStatus: string) => void;
  isAdmin?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onStatusChange, isAdmin }) => {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">
              {resource.resourceId}
            </span>
            <h4 className="text-sm font-bold text-slate-100 mt-0.5 line-clamp-1">
              {resource.name}
            </h4>
          </div>
          <StatusBadge status={resource.operationalStatus} size="sm" />
        </div>

        <span className="inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 mb-3">
          {resource.type}
        </span>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {resource.description}
        </p>

        <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Condition:</span>
            <span className="text-slate-300 font-medium">{resource.maintenanceStatus || 'Nominal'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Availability:</span>
            <span className={resource.availability ? 'text-emerald-400' : 'text-slate-400'}>
              {resource.availability ? 'Ready for Allocation' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="pt-3 mt-4 border-t border-slate-800/60 flex items-center gap-2">
          {resource.operationalStatus === 'available' ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-orange-400 hover:text-orange-300 border-orange-500/30"
              onClick={() => onStatusChange && onStatusChange(resource, 'maintenance')}
              leftIcon={<Wrench className="w-3.5 h-3.5" />}
            >
              Set Maintenance
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
              onClick={() => onStatusChange && onStatusChange(resource, 'available')}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Set Available
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
