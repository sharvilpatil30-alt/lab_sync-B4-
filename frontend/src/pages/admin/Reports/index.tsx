import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Layers,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { useReportsDashboard, useAllBookings, useLabs, useResources } from '../../../hooks';
import {
  ChartContainer,
  UtilizationChart,
  BookingChart,
  StatusPieChart,
  ReportFilterPanel,
} from '../../../components/reports';
import { Breadcrumbs, Skeleton, Table, Column, Button, Select, useToast } from '../../../components/common';
import { LabUtilizationReport, ResourceUtilizationReport } from '../../../types';

export const AdminReportsPage: React.FC = () => {
  const { addToast } = useToast();
  const [startDate, setStartDate] = useState('2026-09-17');
  const [endDate, setEndDate] = useState('2026-09-23');
  const [selectedLabFilter, setSelectedLabFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const { data: reportData, isLoading, refetch } = useReportsDashboard({ startDate, endDate });
  const { data: allBookings = [] } = useAllBookings();
  const { data: labs = [] } = useLabs();
  const { data: resources = [] } = useResources();

  // Booking status metrics calculation
  const completedCount = allBookings.filter((b) => b.status === 'COMPLETED').length;
  const confirmedCount = allBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'ACTIVE').length;
  const queuedCount = allBookings.filter((b) => b.status === 'QUEUED' || b.status === 'WAITLISTED').length;
  const cancelledCount = allBookings.filter((b) => b.status === 'CANCELLED').length;
  const rejectedCount = allBookings.filter((b) => b.status === 'REJECTED').length;

  const pieData = [
    { status: 'Completed', count: completedCount, color: '#10b981' },
    { status: 'Confirmed/Active', count: confirmedCount, color: '#6366f1' },
    { status: 'Queued', count: queuedCount, color: '#f59e0b' },
    { status: 'Cancelled', count: cancelledCount, color: '#94a3b8' },
    { status: 'Rejected', count: rejectedCount, color: '#f43f5e' },
  ];

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Reservations', reportData.summary.totalBookings],
      ['Average Utilization', `${reportData.summary.averageUtilization}%`],
      ['Peak Hour', reportData.summary.peakHour],
      ['Queue Resolution Rate', `${reportData.summary.queueResolutionRate}%`],
      ['Completed Sessions', completedCount],
      ['Confirmed Sessions', confirmedCount],
      ['Queued Sessions', queuedCount],
      ['Cancelled Sessions', cancelledCount],
      ['Rejected Sessions', rejectedCount],
      [],
      ['Laboratory', 'Hours Booked', 'Utilization Rate (%)', 'Total Sessions'],
      ...reportData.labUtilization.map((l) => [l.labName, l.totalHoursBooked, l.utilizationRate, l.bookingCount]),
      [],
      ['Equipment', 'Category', 'Hours Used', 'Utilization Rate (%)'],
      ...reportData.resourceUtilization.map((r) => [r.resourceName, r.type, r.totalHoursUsed, r.utilizationRate]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus-optimizer-report-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Report Exported',
      message: 'Downloaded campus utilization dataset as CSV.',
    });
  };

  const handleExportJSON = () => {
    if (!reportData) return;
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      summary: reportData.summary,
      bookingStatusBreakdown: {
        completed: completedCount,
        confirmedOrActive: confirmedCount,
        queued: queuedCount,
        cancelled: cancelledCount,
        rejected: rejectedCount,
      },
      labUtilization: reportData.labUtilization,
      resourceUtilization: reportData.resourceUtilization,
      bookingTrends: reportData.bookingTrends,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `campus-optimization-analytics-${startDate}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'info',
      title: 'JSON Summary Saved',
      message: 'Exported complete operational analytics schema.',
    });
  };

  // Filtered lab utilization
  const filteredLabUtilization = (reportData?.labUtilization || []).filter((item) => {
    if (selectedLabFilter === 'all') return true;
    return item.labId === selectedLabFilter;
  });

  const labColumns: Column<LabUtilizationReport>[] = [
    { key: 'labName', header: 'Laboratory Facility' },
    {
      key: 'totalHoursBooked',
      header: 'Hours Booked',
      render: (item) => <span className="font-semibold text-slate-200">{item.totalHoursBooked} hrs</span>,
    },
    {
      key: 'utilizationRate',
      header: 'Utilization Rate',
      render: (item) => (
        <span
          className={`font-bold font-mono ${
            item.utilizationRate >= 80
              ? 'text-indigo-400'
              : item.utilizationRate >= 60
              ? 'text-emerald-400'
              : 'text-amber-400'
          }`}
        >
          {item.utilizationRate}%
        </span>
      ),
    },
    { key: 'bookingCount', header: 'Total Sessions Scheduled' },
  ];

  const resourceColumns: Column<ResourceUtilizationReport>[] = [
    { key: 'resourceName', header: 'Hardware Equipment' },
    { key: 'type', header: 'Category' },
    {
      key: 'totalHoursUsed',
      header: 'Workload Hours',
      render: (item) => <span className="font-semibold text-slate-200">{item.totalHoursUsed} hrs</span>,
    },
    {
      key: 'utilizationRate',
      header: 'Capacity Rate',
      render: (item) => (
        <span className="font-bold text-indigo-400 font-mono">{item.utilizationRate}%</span>
      ),
    },
  ];

  if (isLoading || !reportData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Reports & Analytics' }]} />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Campus Optimization & Utilization Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate historical facility demand, peak workload windows, and hardware allocation efficiency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4 text-indigo-400" />}
          >
            Export JSON
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Date Range and Multi-Filter Controls */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex-1">
            <ReportFilterPanel
              startDate={startDate}
              endDate={endDate}
              onDateChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </div>

          <div className="w-full sm:w-64">
            <Select
              label="Filter Laboratory"
              value={selectedLabFilter}
              onChange={(e) => setSelectedLabFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Campus Facilities' },
                ...labs.map((l) => ({ value: l.id || l.labId, label: l.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Sessions</span>
          <p className="text-2xl font-extrabold text-white">{reportData.summary.totalBookings}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Average Utilization</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{reportData.summary.averageUtilization}%</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Peak Demand Window</span>
          <p className="text-base sm:text-lg font-bold text-indigo-300 mt-1">{reportData.summary.peakHour}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Queue Clearance Rate</span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{reportData.summary.queueResolutionRate}%</p>
        </div>
      </div>

      {/* Detailed Booking Counts Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Completed</span>
          <span className="text-xl font-black text-white">{completedCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <span className="text-[10px] uppercase font-bold text-indigo-400 block">Confirmed / Active</span>
          <span className="text-xl font-black text-white">{confirmedCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Queued (Waitlist)</span>
          <span className="text-xl font-black text-white">{queuedCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cancelled</span>
          <span className="text-xl font-black text-white">{cancelledCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-rose-400 block">Rejected</span>
          <span className="text-xl font-black text-white">{rejectedCount}</span>
        </div>
      </div>

      {/* Charts Grid: Trends + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer
            title="Reservation Trends & Volume (Over Time)"
            description="Daily counts of confirmed, completed, and queued reservation requests"
          >
            <BookingChart data={reportData.bookingTrends} />
          </ChartContainer>
        </div>

        <div>
          <ChartContainer
            title="Session Status Distribution"
            description="Lifecycle ratio across confirmed, queued, completed, and cancelled"
          >
            <StatusPieChart data={pieData} />
          </ChartContainer>
        </div>
      </div>

      {/* Facility & Hardware Utilization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <ChartContainer
            title="Laboratory Utilization Rates"
            description="Percentage of available operational hours scheduled"
          >
            <UtilizationChart data={filteredLabUtilization} type="lab" />
          </ChartContainer>

          <Table
            columns={labColumns}
            data={filteredLabUtilization}
            keyExtractor={(i) => i.labId}
          />
        </div>

        <div className="space-y-4">
          <ChartContainer
            title="Equipment & Accelerator Utilization"
            description="Workload hours logged by hardware resources"
          >
            <UtilizationChart data={reportData.resourceUtilization} type="resource" />
          </ChartContainer>

          <Table
            columns={resourceColumns}
            data={reportData.resourceUtilization}
            keyExtractor={(i) => i.resourceId}
          />
        </div>
      </div>
    </div>
  );
};
