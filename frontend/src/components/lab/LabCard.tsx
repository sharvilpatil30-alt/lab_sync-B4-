import React from 'react';
import { Users, MapPin, Building, ArrowRight, CalendarPlus, Clock, Cpu } from 'lucide-react';
import { Lab } from '../../types';
import { StatusBadge, Button } from '../common';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';

interface LabCardProps {
  lab: Lab;
  selectedDate?: string;
  selectedTime?: string;
  onBook?: (lab: Lab) => void;
}

export const LabCard: React.FC<LabCardProps> = ({ lab, selectedDate, selectedTime, onBook }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const isAvailable = lab.operationalStatus === 'available';

  // Format resource preview strings
  const resourceCount = Array.isArray(lab.availableResources) ? lab.availableResources.length : 0;
  const resourceNames = Array.isArray(lab.availableResources)
    ? lab.availableResources
        .slice(0, 2)
        .map((r) => (typeof r === 'string' ? r : r.name))
        .join(', ')
    : '';

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between group shadow-xl hover:shadow-indigo-950/20">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <span className="text-[11px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">
              {lab.labId}
            </span>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors mt-0.5 line-clamp-1">
              {lab.name}
            </h3>
          </div>
          <StatusBadge status={lab.operationalStatus} size="sm" />
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {lab.description}
        </p>

        {/* Selected Date/Time pill if filter was applied */}
        {(selectedDate || selectedTime) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-medium text-indigo-300 mb-3">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>
              {selectedDate || 'Today'} {selectedTime ? `• ${selectedTime}` : ''}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-3 pt-3 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{lab.building}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{lab.location || `Floor ${lab.floor}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Capacity: <strong className="text-slate-200">{lab.capacity}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate text-[11px]">
              {resourceCount > 0 ? `${resourceCount} items (${resourceNames || 'Configured'})` : 'Standard Workstations'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => navigate(`${basePrefix}/labs/${lab.id || lab.labId}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Details
        </Button>
        {role !== 'admin' && (
          <Button
            variant={isAvailable ? 'primary' : 'secondary'}
            size="sm"
            className="flex-1"
            onClick={() => {
              if (onBook) onBook(lab);
              else navigate(`${basePrefix}/bookings/create?labId=${lab.id || lab.labId}`);
            }}
            disabled={lab.operationalStatus === 'offline'}
            leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
          >
            {isAvailable ? 'Book' : 'Queue Slot'}
          </Button>
        )}
      </div>
    </div>
  );
};
