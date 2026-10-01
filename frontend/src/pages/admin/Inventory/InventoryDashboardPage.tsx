import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Search,
  Filter,
  RefreshCw,
  Download,
  Layers,
  HardDrive,
  Monitor,
  Building2,
  Copy,
  Check,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  inventoryApi,
  EquipmentItem,
  EquipmentStatus,
  InventoryDashboardPayload,
  LabInventorySummary,
  ComputerBatchRecord,
} from '../../../services/api/inventory.api';
import { useToast, RITLogo } from '../../../components/common';
import { mockInventoryService } from '../../../services/mock/MockInventoryService';

export const InventoryDashboardPage: React.FC = () => {
  const { addToast } = useToast();
  const [data, setData] = useState<InventoryDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [labFilter, setLabFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'equipment' | 'labs' | 'batches'>('equipment');

  // Detail Modal / Drawer state
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);

  // Fetch data with seamless fallback to uploaded institutional dataset
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getInventoryDashboard();
      if (response && response.equipment && response.equipment.length > 0) {
        setData(response);
      } else {
        const fallback = mockInventoryService.getDashboardPayload();
        setData(fallback);
      }
    } catch (err: any) {
      console.warn('Network issue connecting to /api/v1/inventory backend, loading uploaded RIT dataset:', err);
      const fallback = mockInventoryService.getDashboardPayload();
      setData(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Quick Status Change in real time
  const handleStatusChange = async (itemId: string, newStatus: EquipmentStatus) => {
    setIsUpdating(itemId);
    try {
      const res = await inventoryApi.updateEquipmentStatus(itemId, { status: newStatus });
      if (res.success && data) {
        // Update local state smoothly
        setData((prev) => {
          if (!prev) return prev;
          const updatedEquipment = prev.equipment.map((item) =>
            item.id === itemId ? { ...item, status: newStatus } : item,
          );
          // Recalculate summary counts
          const opCount = updatedEquipment.filter((e) => e.status === 'OPERATIONAL').length;
          const inUseCount = updatedEquipment.filter((e) => e.status === 'IN_USE').length;
          const maintCount = updatedEquipment.filter((e) => e.status === 'MAINTENANCE').length;
          const offCount = updatedEquipment.filter(
            (e) => e.status === 'OFFLINE' || e.status === 'PARTIALLY_WRITTEN_OFF',
          ).length;

          return {
            ...prev,
            summary: {
              ...prev.summary,
              operational_count: opCount,
              in_use_count: inUseCount,
              maintenance_count: maintCount,
              offline_count: offCount,
            },
            equipment: updatedEquipment,
          };
        });

        if (selectedEquipment && selectedEquipment.id === itemId) {
          setSelectedEquipment((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err: any) {
      console.error('Failed to update equipment status:', err);
      alert('Failed to update status on server. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    if (!data?.equipment) return [];
    return data.equipment.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      // Lab filter
      if (labFilter !== 'ALL' && item.lab_code !== labFilter) return false;
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.equipment_name.toLowerCase().includes(q) ||
          item.serial_number.toLowerCase().includes(q) ||
          item.asset_tag.toLowerCase().includes(q) ||
          item.lab_code.toLowerCase().includes(q) ||
          item.lab_name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.processor.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data?.equipment, statusFilter, labFilter, categoryFilter, searchQuery]);

  // Categories and Labs from dataset for filter dropdowns
  const availableCategories = useMemo(() => {
    if (!data?.equipment) return [];
    return Array.from(new Set(data.equipment.map((e) => e.category)));
  }, [data?.equipment]);

  const availableLabs = useMemo(() => {
    if (!data?.labs) return [];
    return data.labs.map((l) => ({ code: l.lab_code, name: l.lab_name }));
  }, [data?.labs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to safely format CSV values according to RFC 4180
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const downloadCsvBlob = (content: string, filename: string) => {
    // Add UTF-8 BOM so Excel and spreadsheet applications properly render Unicode characters
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Export filtered equipment, dead stock batches, or lab summaries to CSV
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);

    // If on Batches View
    if (activeTab === 'batches') {
      const targetBatches = data?.batches || [];
      if (!targetBatches.length) {
        addToast({ type: 'warning', title: 'Export Notice', message: 'No purchase batch records available to export.' });
        return;
      }
      const headers = [
        'Batch ID',
        'Dead Stock Sr No',
        'Lab Code',
        'Lab Name',
        'Brand',
        'Model Name',
        'Purchase Date',
        'Current Quantity',
        'Original Quantity',
        'Unit Rate (INR)',
        'Total Cost (INR)',
        'Supplier Name',
        'Warranty (Years)',
        'Status',
        'Processor',
        'RAM (GB)',
        'Storage',
        'Operating System',
        'Monitor Size (in)',
        'Serial Numbers',
        'Raw Description',
      ];
      const rows = targetBatches.map((b) => [
        escapeCsv(b.batch_id),
        escapeCsv(b.dead_stock_sr_no),
        escapeCsv(b.lab_code),
        escapeCsv(b.lab_name),
        escapeCsv(b.brand),
        escapeCsv(b.model_name),
        escapeCsv(b.purchase_date),
        b.quantity_current,
        b.quantity_original,
        b.unit_rate,
        b.total_cost,
        escapeCsv(b.supplier_name),
        b.warranty_years ?? 'N/A',
        escapeCsv(b.status),
        escapeCsv(b.processor),
        b.ram_gb ?? 'N/A',
        escapeCsv(b.storage),
        escapeCsv(b.operating_system),
        b.monitor_size_in ?? 'N/A',
        escapeCsv(b.serial_numbers_list?.length ? b.serial_numbers_list.join('; ') : b.serial_numbers_raw),
        escapeCsv(b.raw_description),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadCsvBlob(csv, `rit_dead_stock_batches_${timestamp}.csv`);
      addToast({
        type: 'success',
        title: 'Export Complete',
        message: `Successfully exported ${targetBatches.length} RIT purchase batch records to CSV.`,
      });
      return;
    }

    // If on Labs Summary View
    if (activeTab === 'labs') {
      const targetLabs = data?.labs || [];
      if (!targetLabs.length) {
        addToast({ type: 'warning', title: 'Export Notice', message: 'No lab summaries available to export.' });
        return;
      }
      const headers = [
        'Lab Code',
        'Lab Name',
        'Total Batches',
        'Current Workstations Qty',
        'Original Workstations Qty',
        'Total Investment (INR)',
        'Equipment Brands',
        'Equipment Models',
      ];
      const rows = targetLabs.map((l) => [
        escapeCsv(l.lab_code),
        escapeCsv(l.lab_name),
        l.total_batches,
        l.total_current_qty,
        l.total_original_qty,
        l.total_investment,
        escapeCsv(l.brands?.join(', ')),
        escapeCsv(l.models?.join(', ')),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadCsvBlob(csv, `rit_lab_inventory_summary_${timestamp}.csv`);
      addToast({
        type: 'success',
        title: 'Export Complete',
        message: `Successfully exported ${targetLabs.length} laboratory summaries to CSV.`,
      });
      return;
    }

    // Default: Equipment Dataset View
    const targetEquipment = filteredEquipment.length > 0 ? filteredEquipment : (data?.equipment || []);
    if (!targetEquipment.length) {
      addToast({ type: 'warning', title: 'Export Notice', message: 'No equipment items available to export.' });
      return;
    }

    const headers = [
      'Asset Tag',
      'Serial Number',
      'Equipment Name',
      'Category',
      'Brand',
      'Model',
      'Lab Code',
      'Lab Name',
      'Processor',
      'RAM',
      'Storage',
      'Operating System',
      'Status',
      'Health (%)',
      'Unit Cost (INR)',
      'Purchase Date',
      'Supplier',
      'Assigned To',
      'Last Maintenance',
      'Next Maintenance',
    ];
    const rows = targetEquipment.map((e) => [
      escapeCsv(e.asset_tag),
      escapeCsv(e.serial_number),
      escapeCsv(e.equipment_name),
      escapeCsv(e.category),
      escapeCsv(e.brand),
      escapeCsv(e.model),
      escapeCsv(e.lab_code),
      escapeCsv(e.lab_name),
      escapeCsv(e.processor),
      escapeCsv(e.ram),
      escapeCsv(e.storage),
      escapeCsv(e.os),
      escapeCsv(e.status),
      e.health_score,
      e.unit_cost,
      escapeCsv(e.purchase_date),
      escapeCsv(e.supplier_name),
      escapeCsv(e.assigned_to || 'General Lab Pool'),
      escapeCsv(e.last_maintenance),
      escapeCsv(e.next_maintenance),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsvBlob(csv, `rit_equipment_inventory_${timestamp}.csv`);
    addToast({
      type: 'success',
      title: 'Export Complete',
      message: `Successfully exported ${targetEquipment.length} equipment assets as CSV.`,
    });
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Operational
          </span>
        );
      case 'IN_USE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            In Use
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Wrench className="w-3 h-3 text-amber-400" />
            Maintenance
          </span>
        );
      case 'OFFLINE':
      case 'PARTIALLY_WRITTEN_OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {status === 'PARTIALLY_WRITTEN_OFF' ? 'Written-Off' : 'Offline'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Equipment Inventory & Status Console
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Uploaded RIT Dataset (Live)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time tracking of hardware assets, operating conditions, maintenance queues, and lab distributions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            title="Refresh inventory from dataset"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!data || (!data.equipment?.length && !data.batches?.length)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            title={`Export ${activeTab === 'batches' ? 'RIT Purchase Batches' : activeTab === 'labs' ? 'Lab Summaries' : 'Equipment Inventory'} as CSV`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              Export {activeTab === 'batches' ? 'Batches CSV' : activeTab === 'labs' ? 'Labs CSV' : 'Equipment CSV'}
            </span>
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Using local uploaded RIT master inventory dataset.</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              setData(mockInventoryService.getDashboardPayload());
            }}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold"
          >
            Use Uploaded Data
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assets */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Tracked Assets</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {data?.summary.total_equipment ?? (isLoading ? '...' : 0)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({data?.summary.total_batches ?? 28} batches)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            Across 11 Labs (D-01 to D-11)
          </div>
        </div>

        {/* Operational */}
        <div className="glass-card p-4 rounded-2xl border border-emerald-950/60 bg-emerald-950/10 relative overflow-hidden group hover:border-emerald-800/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Operational Assets</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
              {data?.summary.operational_count ?? (isLoading ? '...' : 0)}
            </span>
            {data?.summary.total_equipment ? (
              <span className="text-xs text-emerald-500 font-mono font-semibold">
                {Math.round((data.summary.operational_count / data.summary.total_equipment) * 100)}% Ready
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/70">
            Available for student & faculty allocation
          </div>
        </div>

        {/* Maintenance / Offline */}
        <div className="glass-card p-4 rounded-2xl border border-amber-950/60 bg-amber-950/10 relative overflow-hidden group hover:border-amber-800/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Maintenance & Repair</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
              {data?.summary.maintenance_count ?? (isLoading ? '...' : 0)}
            </span>
            <span className="text-xs text-rose-400 font-mono">
              + {data?.summary.offline_count ?? 0} offline
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400/70">
            Assigned to hardware servicing workflow
          </div>
        </div>

        {/* Capital Investment */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Capital Value</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-purple-300 truncate">
              {data?.summary.total_investment_formatted ?? '₹1,09,79,900'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {data?.summary.total_models ?? 55} normalized model lines
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'equipment'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Equipment Status Table</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-950/60 text-indigo-300 font-mono border border-indigo-700/50">
              {filteredEquipment.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'labs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Lab Distribution (D-01 to D-11)</span>
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'batches'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Purchase Batches (28)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <RITLogo className="w-3.5 h-3.5" variant="mark" rounded="sm" />
          <span>Dataset: <code className="text-emerald-400">RIT Dead-Stock Master (12 Labs)</code></span>
        </div>
      </div>

      {/* EQUIPMENT TABLE VIEW */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search asset tag, serial, model, processor, lab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPERATIONAL">Operational Only</option>
                  <option value="IN_USE">In Use</option>
                  <option value="MAINTENANCE">Under Maintenance</option>
                  <option value="OFFLINE">Offline / Written-off</option>
                </select>
              </div>

              {/* Lab Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">Lab:</span>
                <select
                  value={labFilter}
                  onChange={(e) => setLabFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Laboratories</option>
                  {availableLabs.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">Type:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Equipment Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto text-xs">
              <span className="text-slate-400 text-[11px] shrink-0 font-medium">Quick Filter:</span>
              {[
                { label: 'All', value: 'ALL', count: data?.equipment.length ?? 0 },
                {
                  label: 'Operational',
                  value: 'OPERATIONAL',
                  count: data?.summary.operational_count ?? 0,
                  color: 'text-emerald-400 bg-emerald-500/10',
                },
                {
                  label: 'In Use',
                  value: 'IN_USE',
                  count: data?.summary.in_use_count ?? 0,
                  color: 'text-cyan-400 bg-cyan-500/10',
                },
                {
                  label: 'Maintenance',
                  value: 'MAINTENANCE',
                  count: data?.summary.maintenance_count ?? 0,
                  color: 'text-amber-400 bg-amber-500/10',
                },
                {
                  label: 'Offline',
                  value: 'OFFLINE',
                  count: data?.summary.offline_count ?? 0,
                  color: 'text-rose-400 bg-rose-500/10',
                },
              ].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setStatusFilter(chip.value)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    statusFilter === chip.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({chip.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Serial</th>
                    <th className="py-3 px-4">Equipment & Model</th>
                    <th className="py-3 px-4">Lab Location</th>
                    <th className="py-3 px-4">Specifications</th>
                    <th className="py-3 px-4">Health</th>
                    <th className="py-3 px-4">Status & Live Toggle</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                          <span>Loading RIT institutional equipment dataset...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="w-6 h-6 text-amber-400" />
                          <span className="font-semibold text-slate-200">No equipment found matching criteria</span>
                          <span className="text-xs text-slate-500">
                            Try adjusting your search query or reset the filters.
                          </span>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('ALL');
                              setLabFilter('ALL');
                              setCategoryFilter('ALL');
                            }}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedEquipment(item)}
                      >
                        {/* Asset Tag / Serial */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{item.asset_tag}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.serial_number, item.id);
                              }}
                              className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                              title="Copy Serial Number"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            SN: {item.serial_number}
                          </div>
                        </td>

                        {/* Equipment & Model */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {item.equipment_name}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                              {item.category}
                            </span>
                            <span>• {item.brand}</span>
                          </div>
                        </td>

                        {/* Lab Location */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {item.lab_code}
                            </span>
                            <span className="text-slate-300 font-medium">{item.lab_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Batch: <span className="font-mono">{item.batch_id}</span>
                          </div>
                        </td>

                        {/* Specifications */}
                        <td className="py-3.5 px-4 text-[11px]">
                          {item.processor !== 'N/A' ? (
                            <>
                              <div className="text-slate-200 font-medium truncate max-w-[180px]">
                                {item.processor}
                              </div>
                              <div className="text-slate-400">
                                {item.ram} • {item.storage} • {item.os}
                              </div>
                            </>
                          ) : (
                            <div className="text-slate-400 italic">{item.model}</div>
                          )}
                        </td>

                        {/* Health Score */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.health_score >= 85
                                    ? 'bg-emerald-500'
                                    : item.health_score >= 65
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.health_score}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                item.health_score >= 85
                                  ? 'text-emerald-400'
                                  : item.health_score >= 65
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {item.health_score}%
                            </span>
                          </div>
                        </td>

                        {/* Status & Live Toggle */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(item.status)}

                            {/* Quick Action Dropdown */}
                            <select
                              value={item.status}
                              disabled={isUpdating === item.id}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as EquipmentStatus)
                              }
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 hover:border-slate-600 disabled:opacity-50"
                              title="Update live status on backend"
                            >
                              <option value="OPERATIONAL">Set Operational</option>
                              <option value="IN_USE">Set In-Use</option>
                              <option value="MAINTENANCE">Set Maintenance</option>
                              <option value="OFFLINE">Set Offline</option>
                            </select>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEquipment(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-medium text-[11px] transition-colors border border-slate-700/60"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing <strong>{filteredEquipment.length}</strong> of{' '}
                <strong>{data?.equipment.length ?? 0}</strong> equipment items
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Click any row to inspect full hardware specs & lifecycle logs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LABS DISTRIBUTION VIEW */}
      {activeTab === 'labs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.labs.map((lab) => (
            <div
              key={lab.lab_code}
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {lab.lab_code}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-2">{lab.lab_name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-100">
                    {lab.total_current_qty}
                  </span>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Computers</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Total Purchase Batches:</span>
                  <span className="font-mono font-semibold">{lab.total_batches}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Capital Value:</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {lab.total_investment_formatted}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Brands Installed:</span>
                  <span className="text-slate-200 truncate max-w-[160px]">
                    {lab.brands.join(', ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setLabFilter(lab.lab_code);
                  setActiveTab('equipment');
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
              >
                Inspect {lab.lab_code} Equipment ({lab.total_current_qty})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BATCHES VIEW */}
      {activeTab === 'batches' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              Original Purchase Batches (28 Batches: BAT0005 to BAT0032)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Source: Dead-Stock Ledger</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Lab</th>
                  <th className="py-3 px-4">Brand & Model</th>
                  <th className="py-3 px-4">Qty (Cur/Orig)</th>
                  <th className="py-3 px-4">Unit Rate</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.batches.map((batch) => (
                  <tr key={batch.batch_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {batch.batch_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{batch.lab_code}</td>
                    <td className="py-3 px-4 text-slate-100">
                      <div className="font-semibold">{batch.brand} {batch.model_name}</div>
                      <div className="text-[11px] text-slate-400">{batch.processor}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {batch.quantity_current} / {batch.quantity_original}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{batch.unit_rate_formatted}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {batch.total_cost_formatted}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{batch.purchase_date}</td>
                    <td className="py-3 px-4 text-slate-300 truncate max-w-[150px]">
                      {batch.supplier_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                    {selectedEquipment.asset_tag}
                  </span>
                  {renderStatusBadge(selectedEquipment.status)}
                </div>
                <h3 className="text-xl font-bold text-slate-100 mt-2">
                  {selectedEquipment.equipment_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Located in {selectedEquipment.lab_code} ({selectedEquipment.lab_name})
                </p>
              </div>
              <button
                onClick={() => setSelectedEquipment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Hardware Specification Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Processor</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {selectedEquipment.processor}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">RAM & Storage</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {selectedEquipment.ram} • {selectedEquipment.storage}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Operating System</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {selectedEquipment.os}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Serial Number</span>
                <span className="font-mono font-semibold text-indigo-300 mt-0.5 block">
                  {selectedEquipment.serial_number}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Unit Acquisition Cost</span>
                <span className="font-mono font-bold text-emerald-400 mt-0.5 block">
                  {selectedEquipment.unit_cost_formatted}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Supplier</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {selectedEquipment.supplier_name}
                </span>
              </div>
            </div>

            {/* Health & Maintenance */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Diagnostic Health Score:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedEquipment.health_score}% Operational Integrity
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${selectedEquipment.health_score}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Last Inspection: {selectedEquipment.last_maintenance}</span>
                <span>Next Scheduled: {selectedEquipment.next_maintenance}</span>
              </div>
            </div>

            {/* Status Change Selector in Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Update Status on Server:
              </div>
              <div className="flex items-center gap-2">
                {(['OPERATIONAL', 'IN_USE', 'MAINTENANCE', 'OFFLINE'] as EquipmentStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedEquipment.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedEquipment.status === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
