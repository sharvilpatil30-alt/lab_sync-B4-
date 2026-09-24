import React from 'react';
import { Resource } from '../../types';
import { StatusBadge, Button, Table, Column } from '../common';
import { Wrench, CheckCircle2, Eye, MapPin, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ResourceTableProps {
  resources: Resource[];
  isLoading?: boolean;
  onStatusTransition?: (resource: Resource, targetStatus: string) => void;
  isAdmin?: boolean;
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
  resources,
  isLoading = false,
  onStatusTransition,
  isAdmin = false,
}) => {
  const navigate = useNavigate();

  const columns: Column<Resource>[] = [
    {
      key: 'resourceId',
      header: 'Resource ID',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-indigo-400">
          {r.resourceId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Equipment Name',
      render: (r) => (
        <div>
          <span className="font-medium text-slate-200">{r.name}</span>
          <p className="text-[11px] text-slate-400 truncate max-w-xs">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      render: (r) => (
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
          {r.type}
        </span>
      ),
    },
    {
      key: 'lab',
      header: 'Host Lab / Location',
      render: (r) => {
        const labName = typeof r.lab === 'object' && r.lab !== null ? (r.lab as any).name : String(r.lab || 'Unassigned');
        return (
          <div className="text-xs text-slate-300">
            <span className="font-medium text-slate-200 block">{labName}</span>
          </div>
        );
      },
    },
    {
      key: 'operationalStatus',
      header: 'Operational Status',
      render: (r) => <StatusBadge status={r.operationalStatus} size="sm" />,
    },
    {
      key: 'maintenanceStatus',
      header: 'Maintenance Status',
      render: (r) => (
        <span className="text-xs text-slate-300 font-mono text-[11px]">
          {r.maintenanceStatus || 'Nominal'}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            r.availability || r.operationalStatus === 'available'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              r.availability || r.operationalStatus === 'available'
                ? 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
          {r.availability || r.operationalStatus === 'available' ? 'Available' : 'Restricted'}
        </span>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      render: (r) => (
        <span className="text-[11px] text-slate-400 font-mono">
          {r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isAdmin && onStatusTransition && (
            <>
              {r.operationalStatus === 'available' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusTransition(r, 'maintenance')}
                  className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  title="Schedule Maintenance"
                >
                  <Wrench className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusTransition(r, 'available')}
                  className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  title="Activate Resource"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/resources/${r.id || r.resourceId}`)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Details
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={resources}
      keyExtractor={(r) => r.id || r.resourceId}
      isLoading={isLoading}
      emptyTitle="No Resources Found"
      emptyDescription="No equipment matching current filter criteria."
      onRowClick={
        isAdmin
          ? (r) => navigate(`/admin/resources/${r.id || r.resourceId}`)
          : undefined
      }
    />
  );
};
