import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Edit,
  Eye,
  Power,
  RefreshCw,
  DoorOpen,
  CheckCircle2,
  XCircle,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { useLabs, useResources, useUpdateLab } from '../../../../hooks';
import { Lab, LabOperationalStatus } from '../../../../types';
import {
  Table,
  StatusBadge,
  Button,
  Search,
  Select,
  Breadcrumbs,
  Column,
  ConfirmDialog,
  useToast,
} from '../../../../components/common';

export const AdminLabListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: labs = [], isLoading, refetch, isRefetching } = useLabs({
    search: searchTerm,
    status: statusFilter as any,
  });

  const { data: allResources = [] } = useResources();
  const updateLabMutation = useUpdateLab();

  // Status transition state
  const [statusAction, setStatusAction] = useState<{
    lab: Lab;
    targetStatus: LabOperationalStatus;
    title: string;
    message: string;
  } | null>(null);

  const handleApplyStatusChange = async () => {
    if (!statusAction) return;
    try {
      await updateLabMutation.mutateAsync({
        labId: statusAction.lab.id || statusAction.lab.labId,
        data: { operationalStatus: statusAction.targetStatus },
      });

      addToast({
        type: 'success',
        title: 'Laboratory Status Updated',
        message: `${statusAction.lab.name} is now marked as ${statusAction.targetStatus.toUpperCase()}.`,
      });
      setStatusAction(null);
    } catch {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: 'Could not update facility operational state.',
      });
    }
  };

  const getResourceCountForLab = (lab: Lab) => {
    if (Array.isArray(lab.availableResources) && lab.availableResources.length > 0) {
      return lab.availableResources.length;
    }
    const matching = allResources.filter((r) => {
      const rLab = typeof r.lab === 'object' && r.lab !== null ? (r.lab as any).id : r.lab;
      return rLab === lab.id || rLab === lab.labId;
    });
    return matching.length;
  };

  const columns: Column<Lab>[] = [
    {
      key: 'labId',
      header: 'Lab ID',
      render: (lab: Lab) => (
        <span className="font-mono text-xs font-bold text-indigo-400">
          {lab.labId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Laboratory Name',
      render: (lab: Lab) => (
        <div>
          <span className="font-semibold text-slate-100 hover:text-indigo-300 transition-colors">
            {lab.name}
          </span>
          <p className="text-[11px] text-slate-400 line-clamp-1">{lab.description}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location / Complex',
      render: (lab: Lab) => (
        <div className="text-xs text-slate-300">
          <p className="font-medium text-slate-200">{lab.building}</p>
          <p className="text-[11px] text-slate-400">Floor {lab.floor}</p>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (lab: Lab) => (
        <span className="text-xs text-slate-200 font-medium">
          {lab.capacity} Seats
        </span>
      ),
    },
    {
      key: 'resourceCount',
      header: 'Assigned Equipment',
      render: (lab: Lab) => {
        const count = getResourceCountForLab(lab);
        return (
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {count} {count === 1 ? 'Unit' : 'Units'}
          </span>
        );
      },
    },
    {
      key: 'availability',
      header: 'Availability State',
      render: (lab: Lab) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              lab.operationalStatus === 'available'
                ? 'bg-emerald-400'
                : lab.operationalStatus === 'occupied'
                ? 'bg-blue-400'
                : lab.operationalStatus === 'maintenance'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`}
          />
          <StatusBadge status={lab.operationalStatus} size="sm" />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Operational Controls',
      className: 'text-right',
      render: (lab: Lab) => {
        const isOffline = lab.operationalStatus === 'offline';
        const isAvailable = lab.operationalStatus === 'available';

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Quick Toggle: Enable / Disable */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setStatusAction({
                  lab,
                  targetStatus: isOffline ? 'available' : 'offline',
                  title: isOffline ? 'Enable Laboratory Facility?' : 'Disable / Take Facility Offline?',
                  message: isOffline
                    ? `Re-activate ${lab.name} (${lab.labId}) and open benches for scheduling.`
                    : `Disabling ${lab.name} will prevent any new student or faculty reservations.`,
                })
              }
              className={`text-xs ${
                isOffline
                  ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
              }`}
              title={isOffline ? 'Enable Facility' : 'Disable Facility'}
            >
              <Power className="w-3.5 h-3.5" />
            </Button>

            {/* Quick Toggle: Maintenance */}
            {lab.operationalStatus !== 'maintenance' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setStatusAction({
                    lab,
                    targetStatus: 'maintenance',
                    title: 'Place Laboratory Under Maintenance?',
                    message: `Mark ${lab.name} as under active maintenance and inspection.`,
                  })
                }
                className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                title="Mark Under Maintenance"
              >
                <Wrench className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setStatusAction({
                    lab,
                    targetStatus: 'available',
                    title: 'Restore Laboratory to Available?',
                    message: `Maintenance completed. Restore ${lab.name} to available status.`,
                  })
                }
                className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                title="Restore Facility"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* View / Edit Details */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/labs/${lab.id || lab.labId}`)}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Lab Management' }]} />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-indigo-400" />
            <span>Laboratory Inventory & Controls</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure laboratory operational statuses, seating capacities, and equipment assignments
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isRefetching}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <Search
          placeholder="Filter by lab ID, name, or building complex..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />

        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Operational States' },
              { value: 'available', label: 'Available (Open)' },
              { value: 'occupied', label: 'Occupied (Active)' },
              { value: 'maintenance', label: 'Maintenance (Inspection)' },
              { value: 'offline', label: 'Offline (Disabled)' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={labs}
        keyExtractor={(lab) => lab.id || lab.labId}
        isLoading={isLoading}
        onRowClick={(lab) => navigate(`/admin/labs/${lab.id || lab.labId}`)}
      />

      {/* Status Transition Confirmation Dialog */}
      {statusAction && (
        <ConfirmDialog
          isOpen={true}
          title={statusAction.title}
          message={statusAction.message}
          confirmLabel={`Confirm: ${statusAction.targetStatus.toUpperCase()}`}
          isDestructive={statusAction.targetStatus === 'offline'}
          isLoading={updateLabMutation.isPending}
          onConfirm={handleApplyStatusChange}
          onClose={() => setStatusAction(null)}
        />
      )}
    </div>
  );
};
