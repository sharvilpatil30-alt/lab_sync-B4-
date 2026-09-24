import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu,
  ArrowLeft,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Building,
  Clock,
  Edit,
  Power,
  Calendar,
  Layers,
  Save,
  Check,
} from 'lucide-react';
import {
  useResource,
  useUpdateResourceStatus,
  useUpdateResource,
  useLab,
  useLabs,
  useAllBookings,
  useCreateMaintenance,
} from '../../../../hooks';
import {
  Button,
  StatusBadge,
  Breadcrumbs,
  ConfirmDialog,
  useToast,
  Input,
  Select,
} from '../../../../components/common';

export const AdminResourceDetailsPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: resource, isLoading, refetch } = useResource(resourceId);
  const { data: labs = [] } = useLabs();
  const { data: allBookings = [] } = useAllBookings();

  const updateStatusMutation = useUpdateResourceStatus();
  const updateResourceMutation = useUpdateResource();
  const createMaintenanceMutation = useCreateMaintenance();

  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLab, setEditLab] = useState('');
  const [editMaintenanceStatus, setEditMaintenanceStatus] = useState('');

  // Maintenance form state
  const [maintDescription, setMaintDescription] = useState('Routine calibration and diagnostic verification');
  const [maintEndDate, setMaintEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const labId = resource
    ? typeof resource.lab === 'object' && resource.lab !== null
      ? (resource.lab as any).id
      : resource.lab
    : undefined;

  const { data: lab } = useLab(labId);

  // Synchronize edit fields when resource loads
  React.useEffect(() => {
    if (resource) {
      setEditName(resource.name);
      setEditType(resource.type);
      setEditDescription(resource.description || '');
      setEditLab(
        typeof resource.lab === 'object' && resource.lab !== null
          ? (resource.lab as any).id
          : String(resource.lab || '')
      );
      setEditMaintenanceStatus(resource.maintenanceStatus || 'Nominal');
    }
  }, [resource]);

  const handleApplyStatus = async (newStatus: string) => {
    if (!resource) return;
    try {
      await updateStatusMutation.mutateAsync({
        resourceId: resource.id || resource.resourceId,
        operationalStatus: newStatus,
        maintenanceStatus: newStatus === 'maintenance' ? 'Under diagnostic inspection' : 'Nominal',
      });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `${resource.name} is now transitioned to ${newStatus.toUpperCase()}.`,
      });
      setConfirmStatus(null);
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not change status.',
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    try {
      await updateResourceMutation.mutateAsync({
        resourceId: resource.id || resource.resourceId,
        data: {
          name: editName,
          type: editType,
          description: editDescription,
          lab: editLab,
          maintenanceStatus: editMaintenanceStatus,
        },
      });

      addToast({
        type: 'success',
        title: 'Hardware Profile Saved',
        message: `Updated parameters for ${editName}.`,
      });
      setIsEditing(false);
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not update resource properties.',
      });
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    try {
      await createMaintenanceMutation.mutateAsync({
        maintenanceId: `MAINT-${Math.floor(100 + Math.random() * 900)}`,
        targetType: 'resource',
        target: resource.id || resource.resourceId,
        affectedLab: labId || 'lab_cse_01',
        description: maintDescription,
        status: 'scheduled',
        startDate: new Date().toISOString(),
        endDate: new Date(maintEndDate).toISOString(),
      });

      // Also set status to maintenance
      await updateStatusMutation.mutateAsync({
        resourceId: resource.id || resource.resourceId,
        operationalStatus: 'maintenance',
        maintenanceStatus: maintDescription,
      });

      addToast({
        type: 'success',
        title: 'Maintenance Order Logged',
        message: `Maintenance scheduled for ${resource.name}.`,
      });
      setShowMaintenanceModal(false);
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: 'Could not schedule maintenance.',
      });
    }
  };

  if (isLoading || !resource) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading hardware telemetry...</div>;
  }

  // Find bookings related to this resource or its lab
  const relatedBookings = allBookings.filter((b) => {
    const rMatch = (b.allocatedResources || []).some((res) => {
      const id = typeof res === 'object' && res !== null ? (res as any).id : res;
      return id === resource.id || id === resource.resourceId;
    });
    const lMatch =
      typeof b.lab === 'object' && b.lab !== null
        ? (b.lab as any).id === labId
        : b.lab === labId;
    return rMatch || lMatch;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'Resources', href: '/admin/resources' },
            { label: resource.name },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/resources')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs text-slate-400"
          >
            Back to Inventory
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            leftIcon={<Edit className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Equipment'}
          </Button>
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="font-mono text-xs font-bold text-indigo-400 uppercase">{resource.resourceId}</span>
            <h1 className="text-2xl font-bold text-white mt-0.5">{resource.name}</h1>
            <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Category: {resource.type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={resource.operationalStatus} size="lg" />
          </div>
        </div>

        {/* Edit Form if toggled */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Edit Hardware Properties
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Resource Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <Input
                label="Category / Architecture"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                required
              />

              <Select
                label="Host Laboratory"
                value={editLab}
                onChange={(e) => setEditLab(e.target.value)}
                options={labs.map((l) => ({ value: l.id || l.labId, label: l.name }))}
              />

              <Input
                label="Condition Note"
                value={editMaintenanceStatus}
                onChange={(e) => setEditMaintenanceStatus(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Technical Description
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-100 text-sm p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={updateResourceMutation.isPending}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Host Facility & Location</span>
              <span className="font-bold text-slate-200">
                {lab?.name || (typeof resource.lab === 'object' && resource.lab !== null ? (resource.lab as any).name : String(resource.lab))}
              </span>
              <p className="text-[10px] text-slate-400">
                {lab?.building ? `${lab.building} (Floor ${lab.floor})` : 'Campus Building Node'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Health & Maintenance</span>
              <span className="font-bold text-slate-200">{resource.maintenanceStatus || 'Nominal'}</span>
              <p className="text-[10px] text-slate-400">
                {resource.availability ? 'Available for Allocation' : 'Temporarily Unavailable'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Telemetry Sync</span>
              <span className="font-bold text-slate-200">
                {resource.lastUpdated ? new Date(resource.lastUpdated).toLocaleDateString() : 'Today'}
              </span>
              <p className="text-[10px] text-slate-400">Hardware controller heartbeat active</p>
            </div>
          </div>
        )}

        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Technical Specification & Purpose
          </span>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            {resource.description || 'Standard high-performance campus laboratory hardware unit.'}
          </p>
        </div>

        {/* Operational State Actions & Maintenance Trigger */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              State Transitions & Operational Actions
            </h4>
            <span className="text-[11px] text-slate-500">Requires confirmation</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {resource.operationalStatus !== 'available' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmStatus('available')}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Mark as Available
              </Button>
            )}

            {resource.operationalStatus !== 'in-use' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmStatus('in-use')}
                className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              >
                Set to In-Use
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => setShowMaintenanceModal(true)}
              leftIcon={<Wrench className="w-3.5 h-3.5" />}
            >
              Log / Schedule Maintenance
            </Button>

            {resource.operationalStatus !== 'offline' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmStatus('offline')}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Take Offline
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Related Booking / Usage Information */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Related Reservations & Host Facility Usage ({relatedBookings.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Sessions utilizing this device or host laboratory</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/bookings')}
            className="text-xs text-indigo-400"
          >
            All Bookings
          </Button>
        </div>

        {relatedBookings.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No active or queued reservations referencing this hardware.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {relatedBookings.slice(0, 4).map((b) => (
              <div
                key={b.id || b.bookingId}
                onClick={() => navigate(`/admin/bookings/${b.id || b.bookingId}`)}
                className="py-3 px-2 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-semibold">{b.bookingId}</span>
                    <StatusBadge status={b.status} size="sm" />
                    <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800">
                      {b.userRole}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium mt-0.5">{b.purpose}</p>
                </div>

                <div className="text-right text-slate-400 shrink-0">
                  <p className="font-medium text-slate-200">{b.date}</p>
                  <p className="text-[11px]">{b.startTime} - {b.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Status Transition */}
      <ConfirmDialog
        isOpen={!!confirmStatus}
        onClose={() => setConfirmStatus(null)}
        onConfirm={() => confirmStatus && handleApplyStatus(confirmStatus)}
        title="Confirm Operational State Transition"
        message={`Are you sure you want to transition ${resource.name} (${resource.resourceId}) to state "${confirmStatus?.toUpperCase()}"?`}
        confirmLabel={`Set to ${confirmStatus?.toUpperCase()}`}
        isDestructive={confirmStatus === 'offline'}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Modal: Schedule Maintenance */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Wrench className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Schedule Equipment Maintenance</h3>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase">Description / Work Note</label>
                <textarea
                  rows={3}
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-slate-200 text-xs p-3 focus:outline-none"
                  required
                />
              </div>

              <Input
                label="Target Completion Date"
                type="date"
                value={maintEndDate}
                onChange={(e) => setMaintEndDate(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMaintenanceModal(false)}
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
                  Dispatch Maintenance Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
