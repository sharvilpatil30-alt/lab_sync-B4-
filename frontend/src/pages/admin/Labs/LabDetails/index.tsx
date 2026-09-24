import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sliders, Save, ArrowLeft, Cpu, Building, MapPin, Users } from 'lucide-react';
import { useLab, useUpdateLab, useResources } from '../../../../hooks';
import { Button, Input, Select, Breadcrumbs, StatusBadge, useToast, ErrorMessage } from '../../../../components/common';
import { LabOperationalStatus } from '../../../../types';

export const AdminLabDetailsPage: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: lab, isLoading, refetch } = useLab(labId);
  const { data: allResources = [] } = useResources();
  const updateMutation = useUpdateLab();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [operationalStatus, setOperationalStatus] = useState<LabOperationalStatus>('available');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState<number | string>(1);

  useEffect(() => {
    if (lab) {
      setName(lab.name);
      setDescription(lab.description);
      setCapacity(lab.capacity);
      setOperationalStatus(lab.operationalStatus);
      setBuilding(lab.building);
      setFloor(lab.floor);
    }
  }, [lab]);

  const assignedResources = allResources.filter((r) => {
    const rLab = typeof r.lab === 'object' && r.lab !== null ? (r.lab as any).id : r.lab;
    return rLab === lab?.id || rLab === lab?.labId;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId) return;

    try {
      await updateMutation.mutateAsync({
        labId: lab?.id || labId,
        data: {
          name,
          description,
          capacity: Number(capacity),
          operationalStatus,
          building,
          floor,
        },
      });

      addToast({
        type: 'success',
        title: 'Laboratory Updated',
        message: `Successfully saved operational updates for ${name}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update laboratory parameters.',
      });
    }
  };

  if (isLoading || !lab) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading facility records...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'Lab Management', href: '/admin/labs' },
            { label: `${lab.name} (${lab.labId})` },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/labs')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs text-slate-400"
        >
          Back to List
        </Button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="font-mono text-xs text-indigo-400 font-bold uppercase">{lab.labId}</span>
            <h1 className="text-xl font-bold text-white mt-0.5">Edit Laboratory Parameters</h1>
          </div>
          <StatusBadge status={operationalStatus} size="md" />
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Facility Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Operational Status"
              value={operationalStatus}
              onChange={(e) => setOperationalStatus(e.target.value as any)}
              options={[
                { value: 'available', label: 'Available (Open for booking)' },
                { value: 'occupied', label: 'Occupied (Active in-use)' },
                { value: 'maintenance', label: 'Maintenance (Under inspection)' },
                { value: 'offline', label: 'Offline (Disabled)' },
              ]}
            />

            <Input
              label="Building Complex"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Floor / Level"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                required
              />
              <Input
                label="Capacity (Seats)"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Facility Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-100 text-sm p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Operational Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Associated Hardware Equipment */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Assigned Equipment ({assignedResources.length})</span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/resources/create?labId=${lab.id || lab.labId}`)}
            className="text-xs"
          >
            Add Hardware to Lab
          </Button>
        </div>

        {assignedResources.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">
            No equipment assigned to this room.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assignedResources.map((res) => (
              <div
                key={res.id || res.resourceId}
                onClick={() => navigate(`/admin/resources/${res.id || res.resourceId}`)}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-[10px] text-indigo-400 font-semibold">{res.resourceId}</span>
                  <h4 className="text-xs font-bold text-slate-200 mt-0.5">{res.name}</h4>
                  <p className="text-[10px] text-slate-400">{res.type}</p>
                </div>
                <StatusBadge status={res.operationalStatus} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
