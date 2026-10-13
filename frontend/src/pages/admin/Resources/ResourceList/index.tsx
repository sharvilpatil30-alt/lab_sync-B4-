import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Plus, Filter, RefreshCw, Search as SearchIcon } from 'lucide-react';
import { useResources, useUpdateResourceStatus, useLabs } from '../../../../hooks';
import { Resource } from '../../../../types';
import { ResourceTable } from '../../../../components/resource';
import { Button, Select, Breadcrumbs, ConfirmDialog, useToast, Search } from '../../../../components/common';

export const AdminResourceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [labFilter, setLabFilter] = useState('all');

  const { data: labs = [] } = useLabs();
  const { data: resources = [], isLoading, refetch, isRefetching } = useResources({
    type: typeFilter,
    status: statusFilter as any,
    lab: labFilter,
  });

  const updateStatusMutation = useUpdateResourceStatus();
  const [transitionTarget, setTransitionTarget] = useState<{ resource: Resource; targetStatus: string } | null>(null);

  // Filter by search term client-side if needed
  const filteredResources = resources.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchId = (r.resourceId || '').toLowerCase().includes(term);
    const matchName = (r.name || '').toLowerCase().includes(term);
    const matchType = (r.type || '').toLowerCase().includes(term);
    return matchId || matchName || matchType;
  });

  const handleConfirmTransition = async () => {
    if (!transitionTarget) return;
    try {
      await updateStatusMutation.mutateAsync({
        resourceId: transitionTarget.resource.id || transitionTarget.resource.resourceId,
        operationalStatus: transitionTarget.targetStatus,
      });

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `${transitionTarget.resource.name} is now marked as ${transitionTarget.targetStatus.toUpperCase()}.`,
      });
      setTransitionTarget(null);
    } catch {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: 'Could not change hardware operational status.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Resource Inventory' }]} />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-400" />
            <span>Hardware & Equipment Inventory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor GPU accelerators, robotic equipment, and fabrication machinery across campus facilities
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
            Refresh Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/resources/add')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Resource
          </Button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <Search
          placeholder="Search by hardware name, resource ID (e.g. RES-101), or keyword..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Category / Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'compute', label: 'Compute / GPUs' },
              { value: 'robotics', label: 'Robotics & Automation' },
              { value: 'server', label: 'Server & Rack Infrastructure' },
              { value: 'networking', label: 'Networking & Gateways' },
              { value: 'fabrication', label: 'Rapid Prototyping & CNC' },
              { value: 'vr', label: 'Virtual & Mixed Reality' },
              { value: 'biotech', label: 'Biotechnology & Sequencing' },
            ]}
          />

          <Select
            label="Operational Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Operational States' },
              { value: 'available', label: 'Available (Ready)' },
              { value: 'in-use', label: 'In-Use (Allocated)' },
              { value: 'maintenance', label: 'Maintenance (Inspection)' },
              { value: 'offline', label: 'Offline (Disabled)' },
            ]}
          />

          <Select
            label="Host Facility"
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Campus Facilities' },
              ...labs.map((l) => ({ value: l.id || l.labId, label: l.name })),
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <ResourceTable
        resources={filteredResources}
        isLoading={isLoading}
        isAdmin={true}
        onStatusTransition={(resource, targetStatus) =>
          setTransitionTarget({ resource, targetStatus })
        }
      />

      {/* Status Transition Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!transitionTarget}
        onClose={() => setTransitionTarget(null)}
        onConfirm={handleConfirmTransition}
        title="Change Resource Operational State"
        message={`Are you sure you want to transition ${transitionTarget?.resource.name} (${transitionTarget?.resource.resourceId}) to "${transitionTarget?.targetStatus.toUpperCase()}"?`}
        confirmLabel={`Set to ${transitionTarget?.targetStatus.toUpperCase()}`}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
};
