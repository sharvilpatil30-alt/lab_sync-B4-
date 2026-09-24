import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu, Plus, ArrowLeft } from 'lucide-react';
import { useCreateResource, useLabs } from '../../../../hooks';
import { Button, Input, Select, Breadcrumbs, useToast, ErrorMessage } from '../../../../components/common';
import { ResourceOperationalStatus } from '../../../../types';

export const AddResourcePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultLabId = searchParams.get('labId') || '';
  const { addToast } = useToast();

  const { data: labs = [] } = useLabs();
  const createMutation = useCreateResource();

  const [resourceId, setResourceId] = useState(`RES-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [type, setType] = useState('Compute / GPU');
  const [description, setDescription] = useState('');
  const [lab, setLab] = useState(defaultLabId);
  const [operationalStatus, setOperationalStatus] = useState<ResourceOperationalStatus>('available');
  const [maintenanceStatus, setMaintenanceStatus] = useState('Nominal');
  const [error, setError] = useState<string | null>(null);

  // Set default lab if not set
  React.useEffect(() => {
    if (!lab && labs.length > 0) {
      setLab(labs[0].id || labs[0].labId);
    }
  }, [labs, lab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Resource Name is required.');
      return;
    }
    if (!resourceId.trim()) {
      setError('Resource Tag / ID is required.');
      return;
    }
    if (!lab) {
      setError('Please select an assigned laboratory facility.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        resourceId: resourceId.trim(),
        name: name.trim(),
        type,
        description: description.trim(),
        lab,
        operationalStatus,
        maintenanceStatus: maintenanceStatus.trim(),
        availability: operationalStatus === 'available',
        lastUpdated: new Date().toISOString(),
      });

      addToast({
        type: 'success',
        title: 'Resource Registered',
        message: `${name} has been added to laboratory inventory.`,
      });
      navigate('/admin/resources');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not register resource. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <Breadcrumbs
          items={[
            { label: 'Resources', href: '/admin/resources' },
            { label: 'Add New Resource' },
          ]}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/resources')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs text-slate-400"
        >
          Cancel
        </Button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Register Hardware Resource</h1>
            <p className="text-xs text-slate-400 mt-0.5">Catalog compute nodes, optical devices, or fabrication tools</p>
          </div>
        </div>

        {error && (
          <ErrorMessage
            title="Registration Failed"
            message={error}
            onRetry={() => setError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Resource Tag / ID"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
            />

            <Input
              label="Resource Name"
              placeholder="e.g. NVIDIA H100 80GB Node"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Hardware Category"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'Compute / GPU', label: 'Compute / GPU Node' },
                { value: 'Robotics', label: 'Robotics & Automation' },
                { value: 'Server', label: 'Server & Rack Compute' },
                { value: 'Networking', label: 'Networking & Switch Rig' },
                { value: 'Rapid Prototyping', label: 'Rapid Prototyping / 3D Printer' },
                { value: 'Fabrication', label: 'Fabrication / CNC Center' },
                { value: 'VR / AR', label: 'Spatial Computing / VR Kit' },
                { value: 'Biotech', label: 'Biotech & Sequencing' },
                { value: 'Electronic Testing', label: 'Electronic Testing & Oscilloscope' },
              ]}
            />

            <Select
              label="Assigned Laboratory"
              value={lab}
              onChange={(e) => setLab(e.target.value)}
              options={labs.map((l) => ({ value: l.id || l.labId, label: l.name }))}
            />

            <Select
              label="Initial Status"
              value={operationalStatus}
              onChange={(e) => setOperationalStatus(e.target.value as any)}
              options={[
                { value: 'available', label: 'Available (Ready for allocation)' },
                { value: 'maintenance', label: 'Maintenance (Under inspection)' },
                { value: 'offline', label: 'Offline' },
              ]}
            />

            <Input
              label="Condition Note"
              value={maintenanceStatus}
              onChange={(e) => setMaintenanceStatus(e.target.value)}
              placeholder="e.g. Nominal, calibrated yesterday"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Technical Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify technical parameters, interfaces, or driver requirements..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-100 text-sm p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add to Inventory
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
