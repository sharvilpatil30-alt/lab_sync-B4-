import React from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Input, Select } from '../common';

interface ReportFilterPanelProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  selectedMetric?: string;
  onMetricChange?: (metric: string) => void;
}

export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  startDate,
  endDate,
  onDateChange,
  selectedMetric = 'all',
  onMetricChange,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
        <Filter className="w-4 h-4 text-indigo-400" />
        <span>Report Scope & Intervals</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="text-xs py-1.5"
          />
          <span className="text-slate-500 text-xs">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="text-xs py-1.5"
          />
        </div>

        {onMetricChange && (
          <Select
            value={selectedMetric}
            onChange={(e) => onMetricChange(e.target.value)}
            className="text-xs py-1.5"
            options={[
              { value: 'all', label: 'All Campus Sectors' },
              { value: 'cse', label: 'Computer Science & AI' },
              { value: 'engineering', label: 'Engineering & FabLab' },
              { value: 'science', label: 'Life Sciences & Physics' },
            ]}
          />
        )}
      </div>
    </div>
  );
};
