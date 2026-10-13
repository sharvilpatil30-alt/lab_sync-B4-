import React from 'react';
import { Filter, RotateCcw, Clock, Cpu, Lightbulb } from 'lucide-react';
import { LabFilters } from '../../types';
import { Button, Select, Input } from '../common';

interface LabFilterPanelProps {
  filters: LabFilters;
  onChange: (filters: LabFilters) => void;
  onReset: () => void;
}

export const LabFilterPanel: React.FC<LabFilterPanelProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'available', label: 'Available Now' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'offline', label: 'Offline' },
  ];

  const availabilityOptions = [
    { value: 'all', label: 'All Availabilities' },
    { value: 'available', label: 'Fully Available' },
    { value: 'partial', label: 'Partial Availability' },
    { value: 'occupied', label: 'Fully Occupied' },
  ];

  const buildingOptions = [
    { value: 'all', label: 'All Buildings' },
    { value: 'Alan Turing Hall', label: 'Alan Turing Hall (CSE)' },
    { value: 'Grace Hopper Complex', label: 'Grace Hopper Complex (AI)' },
    { value: 'Nikola Tesla Building', label: 'Nikola Tesla Building (IoT)' },
    { value: 'Ada Lovelace Hall', label: 'Ada Lovelace Hall (VR)' },
    { value: 'Claude Shannon Building', label: 'Claude Shannon Building (Sec)' },
    { value: 'Thomas Edison Workshop', label: 'Thomas Edison Workshop (Fab)' },
    { value: 'Rosalind Franklin Center', label: 'Rosalind Franklin Center (Bio)' },
    { value: 'Niels Bohr Institute', label: 'Niels Bohr Institute (Physics)' },
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Advanced Laboratory Filters
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="text-xs text-slate-400 hover:text-white"
        >
          Reset Filters
        </Button>
      </div>

      {/* Row 1: Core status & location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select
          label="Lab Status"
          value={filters.status || 'all'}
          onChange={(e) => onChange({ ...filters, status: e.target.value as any })}
          options={statusOptions}
        />

        <Select
          label="Availability Mode"
          value={filters.availability || 'all'}
          onChange={(e) => onChange({ ...filters, availability: e.target.value as any })}
          options={availabilityOptions}
        />

        <Select
          label="Building / Location"
          value={filters.building || 'all'}
          onChange={(e) => onChange({ ...filters, building: e.target.value })}
          options={buildingOptions}
        />

        <Input
          label="Min. Capacity (Seats)"
          type="number"
          min="0"
          placeholder="e.g. 20"
          value={filters.capacity !== undefined ? String(filters.capacity) : ''}
          onChange={(e) =>
            onChange({ ...filters, capacity: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
        />
      </div>

      {/* Row 2: Date, Time & Equipment / Capability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        <Input
          label="Target Date"
          type="date"
          value={filters.date || ''}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Start Time"
            type="time"
            value={filters.startTime || ''}
            onChange={(e) => onChange({ ...filters, startTime: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={filters.endTime || ''}
            onChange={(e) => onChange({ ...filters, endTime: e.target.value })}
          />
        </div>

        <Input
          label="Required Equipment"
          placeholder="e.g. GPU, FPGA, VR, 3D"
          value={filters.equipment || ''}
          onChange={(e) => onChange({ ...filters, equipment: e.target.value })}
          leftIcon={<Cpu className="w-3.5 h-3.5 text-indigo-400" />}
        />

        <Input
          label="Capability / Domain"
          placeholder="e.g. AI, Robotics, Security"
          value={filters.capability || ''}
          onChange={(e) => onChange({ ...filters, capability: e.target.value })}
          leftIcon={<Lightbulb className="w-3.5 h-3.5 text-amber-400" />}
        />
      </div>
    </div>
  );
};
