import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  RefreshCw,
  AlertTriangle,
  Layers,
  Check,
} from 'lucide-react';
import {
  useMaintenance,
  useUpdateMaintenanceStatus,
  useCreateMaintenance,
  useLabs,
  useResources,
} from '../../../../hooks';
import { MaintenanceRecord } from '../../../../types';
import {
  Table,
  StatusBadge,
  Button,
  Breadcrumbs,
  ConfirmDialog,
  useToast,
  Select,
  Input,
  Column,
} from '../../../../components/common';

export const AdminMaintenanceListPage: React.FC = () => {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { data: records = [], isLoading, refetch, isRefetching } = useMaintenance({
    status: statusFilter as any,
  });
  const { data: labs = [] } = useLabs();
  const { data: resources = [] } = useResources();

  const updateStatusMutation = useUpdateMaintenanceStatus();
  const createMaintenanceMutation = useCreateMaintenance();

  const [actionTarget, setActionTarget] = useState<{
    record: MaintenanceRecord;
    nextStatus: string;
    title: string;
    message: string;
    isResolve?: boolean;
  } | null>(null);

  // New Maintenance Form State
  const [targetType, setTargetType] = useState<'lab' | 'resource'>('lab');
  const [targetId, setTargetId] = useState('');
  const [affectedLabId, setAffectedLabId] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });

  // Sync initial select values
  React.useEffect(() => {
    if (labs.length > 0 && !affectedLabId) {
      setAffectedLabId(labs[0].id || labs[0].labId);
    }
    if (targetType === 'lab' && labs.length > 0 && !targetId) {
      setTargetId(labs[0].id || labs[0].labId);
    } else if (targetType === 'resource' && resources.length > 0 && !targetId) {
      setTargetId(resources[0].id || resources[0].resourceId);
    }
  }, [labs, resources, targetType, affectedLabId, targetId]);

  const handleApplyTransition = async () => {
    if (!actionTarget) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: actionTarget.record.id || actionTarget.record.maintenanceId,
        status: actionTarget.nextStatus,
      });

      addToast({
        type: 'success',
        title: actionTarget.isResolve ? 'Maintenance Resolved' : 'Status Updated',
        message: `Task ${actionTarget.record.maintenanceId} is now ${actionTarget.nextStatus}. Asset restored to operational readiness.`,
      });
      setActionTarget(null);
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not change maintenance status.',
      });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !targetId) return;

    try {
      await createMaintenanceMutation.mutateAsync({
        maintenanceId: `MAINT-${Math.floor(100 + Math.random() * 900)}`,
        targetType,
        target: targetId,
        affectedLab: affectedLabId || (targetType === 'lab' ? targetId : 'lab_cse_01'),
        description: description.trim(),
        status: 'scheduled',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      addToast({
        type: 'success',
        title: 'Maintenance Order Scheduled',
        message: `Work order dispatched for ${targetType} ${targetId}.`,
      });
      setShowScheduleModal(false);
      setDescription('');
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Scheduling Failed',
        message: 'Could not create maintenance record.',
      });
    }
  };

  const getTargetName = (r: MaintenanceRecord) => {
    if (r.targetType === 'lab') {
      const lab = labs.find((l) => l.id === r.target || l.labId === r.target);
      return lab ? `Lab: ${lab.name}` : `Lab: ${r.target}`;
    }
    const res = resources.find((item) => item.id === r.target || item.resourceId === r.target);
    return res ? `Item: ${res.name}` : `Resource: ${r.target}`;
  };

  const getAffectedLabName = (r: MaintenanceRecord): string => {
    const lId = r.affectedLab;
    if (typeof lId === 'object' && lId !== null) {
      return (lId as any).name || 'Campus Facility';
    }
    const lab = labs.find((l) => l.id === lId || l.labId === lId);
    return lab ? lab.name : String(lId || 'Campus Facility');
  };

  const getOperationalImpact = (r: MaintenanceRecord) => {
    if (r.status === 'completed' || r.status === 'cancelled') {
      return { label: 'Restored / Nominal', color: 'text-emerald-400' };
    }
    if (r.targetType === 'lab') {
      return { label: 'Facility Workstations Held', color: 'text-rose-400' };
    }
    return { label: 'Resource Hardware Bound', color: 'text-amber-400' };
  };

  const columns: Column<MaintenanceRecord>[] = [
    {
      key: 'maintenanceId',
      header: 'Task ID',
      render: (m: MaintenanceRecord) => (
        <span className="font-mono text-xs font-bold text-amber-400">
          {m.maintenanceId}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Affected Asset & Target',
      render: (m: MaintenanceRecord) => (
        <div>
          <span className="font-semibold text-slate-200">{getTargetName(m)}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {m.targetType}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              In: {getAffectedLabName(m)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description & Scope',
      render: (m: MaintenanceRecord) => (
        <p className="text-xs text-slate-300 max-w-xs sm:max-w-sm line-clamp-2">{m.description}</p>
      ),
    },
    {
      key: 'operationalImpact',
      header: 'Operational Impact',
      render: (m: MaintenanceRecord) => {
        const impact = getOperationalImpact(m);
        return (
          <span className={`text-xs font-medium ${impact.color}`}>
            {impact.label}
          </span>
        );
      },
    },
    {
      key: 'schedule',
      header: 'Schedule Window',
      render: (m: MaintenanceRecord) => (
        <div className="text-xs text-slate-400 font-mono text-[11px]">
          <p>{new Date(m.startDate).toLocaleDateString()} - {new Date(m.endDate).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m: MaintenanceRecord) => <StatusBadge status={m.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Workflow Controls',
      className: 'text-right',
      render: (m: MaintenanceRecord) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {m.status === 'scheduled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActionTarget({
                  record: m,
                  nextStatus: 'in-progress',
                  title: 'Initiate Maintenance Task?',
                  message: `Transition task ${m.maintenanceId} to IN-PROGRESS and notify lab administrators.`,
                })
              }
              className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              leftIcon={<Play className="w-3 h-3" />}
            >
              Start
            </Button>
          )}

          {m.status === 'in-progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActionTarget({
                  record: m,
                  nextStatus: 'completed',
                  title: 'Resolve & Complete Maintenance?',
                  message: `Mark work order ${m.maintenanceId} resolved. Target asset will be returned to Available status.`,
                  isResolve: true,
                })
              }
              className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              leftIcon={<CheckCircle2 className="w-3 h-3" />}
            >
              Resolve
            </Button>
          )}

          {(m.status === 'scheduled' || m.status === 'in-progress') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionTarget({
                  record: m,
                  nextStatus: 'cancelled',
                  title: 'Cancel Maintenance Order?',
                  message: `Cancel task ${m.maintenanceId} without performing servicing.`,
                })
              }
              className="text-xs text-rose-400 hover:bg-rose-500/10 px-2"
              title="Cancel Maintenance"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Maintenance Management' }]} />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            <span>Facility & Equipment Maintenance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track calibration schedules, servicing tasks, and lifecycle status transitions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowScheduleModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">
          Showing {records.length} maintenance records
        </span>

        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Maintenance States' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'in-progress', label: 'In-Progress' },
              { value: 'completed', label: 'Completed (Resolved)' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={records}
        keyExtractor={(m) => m.id || m.maintenanceId}
        isLoading={isLoading}
      />

      {/* Transition / Resolve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleApplyTransition}
        title={actionTarget?.title || 'Confirm Status Transition'}
        message={actionTarget?.message || 'Proceed with maintenance status change?'}
        confirmLabel={`Confirm: ${actionTarget?.nextStatus.toUpperCase()}`}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Wrench className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white">Create Maintenance Work Order</h3>
                <p className="text-xs text-slate-400 mt-0.5">Schedule facility downtime or instrument calibration</p>
              </div>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Target Asset Type"
                  value={targetType}
                  onChange={(e) => {
                    const t = e.target.value as 'lab' | 'resource';
                    setTargetType(t);
                    if (t === 'lab' && labs.length > 0) setTargetId(labs[0].id || labs[0].labId);
                    if (t === 'resource' && resources.length > 0) setTargetId(resources[0].id || resources[0].resourceId);
                  }}
                  options={[
                    { value: 'lab', label: 'Laboratory Facility' },
                    { value: 'resource', label: 'Hardware Resource' },
                  ]}
                />

                <Select
                  label={targetType === 'lab' ? 'Select Laboratory' : 'Select Equipment'}
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  options={
                    targetType === 'lab'
                      ? labs.map((l) => ({ value: l.id || l.labId, label: l.name }))
                      : resources.map((r) => ({ value: r.id || r.resourceId, label: `${r.name} (${r.resourceId})` }))
                  }
                />
              </div>

              <Select
                label="Host / Affected Campus Lab"
                value={affectedLabId}
                onChange={(e) => setAffectedLabId(e.target.value)}
                options={labs.map((l) => ({ value: l.id || l.labId, label: l.name }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <Input
                  label="Target Completion"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase">Work Description / Impact</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope of maintenance, calibration requirements, or safety inspection..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-slate-200 text-xs p-3 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMaintenanceMutation.isPending}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Schedule Work Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
