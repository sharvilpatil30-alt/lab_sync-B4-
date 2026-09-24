import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { LabUtilizationReport, ResourceUtilizationReport } from '../../types';

interface UtilizationChartProps {
  data: (LabUtilizationReport | ResourceUtilizationReport)[];
  type?: 'lab' | 'resource';
}

export const UtilizationChart: React.FC<UtilizationChartProps> = ({ data, type = 'lab' }) => {
  const chartData = data.map((item) => ({
    name: 'labName' in item ? item.labName : item.resourceName,
    utilization: item.utilizationRate,
    hours: 'totalHoursBooked' in item ? item.totalHoursBooked : item.totalHoursUsed,
  }));

  const getBarColor = (rate: number) => {
    if (rate >= 85) return '#6366f1'; // Indigo
    if (rate >= 60) return '#3b82f6'; // Blue
    return '#10b981'; // Emerald
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: '#f8fafc',
            }}
            formatter={(value: any, name: string) => [
              `${value}%`,
              name === 'utilization' ? 'Utilization' : name,
            ]}
          />
          <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.utilization)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
