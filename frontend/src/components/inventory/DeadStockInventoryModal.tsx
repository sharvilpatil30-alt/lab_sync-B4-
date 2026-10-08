import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Cpu,
  Layers,
  Building,
  RefreshCw,
  HardDrive,
  Monitor,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  inventoryApi,
  ComputerBatchRecord,
  NormalizedEquipmentModel,
  InventoryStats,
  LabInventorySummary,
} from '../../services/api';

interface DeadStockInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'batches' | 'models' | 'labs';
}

export const DeadStockInventoryModal: React.FC<DeadStockInventoryModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'batches',
}) => {
  const [activeTab, setActiveTab] = useState<'batches' | 'models' | 'labs'>(defaultTab);
  const [batches, setBatches] = useState<ComputerBatchRecord[]>([]);
  const [models, setModels] = useState<NormalizedEquipmentModel[]>([]);
  const [labsSummary, setLabsSummary] = useState<LabInventorySummary[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [batchesRes, modelsRes, labsRes, statsRes] = await Promise.all([
        inventoryApi.getBatches(),
        inventoryApi.getModels(),
        inventoryApi.getLabsSummary(),
        inventoryApi.getSummaryStats(),
      ]);

      if (batchesRes.success) setBatches(batchesRes.data);
      if (modelsRes.success) setModels(modelsRes.data);
      if (labsRes.success) setLabsSummary(labsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch real-time inventory from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesLab =
        selectedLabFilter === 'all' || b.lab_code.toLowerCase() === selectedLabFilter.toLowerCase();
      const s = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !s ||
        b.batch_id.toLowerCase().includes(s) ||
        b.lab_name.toLowerCase().includes(s) ||
        b.lab_code.toLowerCase().includes(s) ||
        b.model_name.toLowerCase().includes(s) ||
        b.brand.toLowerCase().includes(s) ||
        b.processor.toLowerCase().includes(s) ||
        b.operating_system.toLowerCase().includes(s) ||
        b.raw_description.toLowerCase().includes(s) ||
        b.supplier_name.toLowerCase().includes(s) ||
        b.serial_numbers_raw.toLowerCase().includes(s);

      return matchesLab && matchesSearch;
    });
  }, [batches, selectedLabFilter, searchQuery]);

  // Filtered Models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesCat =
        selectedCategoryFilter === 'all' ||
        m.category_id.toUpperCase() === selectedCategoryFilter.toUpperCase();
      const s = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !s ||
        m.model_id.toLowerCase().includes(s) ||
        m.model_name.toLowerCase().includes(s) ||
        m.brand.toLowerCase().includes(s) ||
        m.category_name.toLowerCase().includes(s) ||
        m.configuration_summary.toLowerCase().includes(s);

      return matchesCat && matchesSearch;
    });
  }, [models, selectedCategoryFilter, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-6xl rounded-2xl glass-panel border border-slate-800 shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Titlebar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Dead-Stock Inventory & Normalized Equipment Master
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Backend Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative register of 28 purchase batches, 55 normalized hardware models across 11 campus laboratories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh from Backend"
              className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Top KPI Ribbon */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Purchase Batches</p>
                <p className="text-base font-bold text-white">{stats.total_batches} <span className="text-[10px] text-slate-400 font-normal">Batches</span></p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Computers Active</p>
                <p className="text-base font-bold text-emerald-400">{stats.total_current_quantity} <span className="text-[10px] text-slate-400 font-normal">/ {stats.total_original_quantity}</span></p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Valuation</p>
                <p className="text-sm sm:text-base font-bold text-amber-400">{stats.total_investment_formatted}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Equipment Models</p>
                <p className="text-base font-bold text-purple-400">{stats.total_models} <span className="text-[10px] text-slate-400 font-normal">({stats.total_categories} Cats)</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls & Search Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
          {/* Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'batches'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Computers Batches (28)
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'models'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Normalized Models (55)
            </button>
            <button
              onClick={() => setActiveTab('labs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'labs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lab Breakdown (11)
            </button>
          </div>

          {/* Search Box & Quick Filters */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeTab === 'batches'
                    ? 'Search by batch, model, processor, OS, serial no, supplier...'
                    : 'Search models by brand, model name, category, spec...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {activeTab === 'batches' && (
              <select
                value={selectedLabFilter}
                onChange={(e) => setSelectedLabFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Labs (11)</option>
                <option value="D-01">D-01 (Linux)</option>
                <option value="D-02">D-02 (Database)</option>
                <option value="D-03">D-03 (Project)</option>
                <option value="D-04">D-04 (App Dev)</option>
                <option value="D-05">D-05 (OS Lab)</option>
                <option value="D-06">D-06 (Web Dev)</option>
                <option value="D-07">D-07 (Network)</option>
                <option value="D-08">D-08 (AI & ML)</option>
                <option value="D-09">D-09 (Apple Lab)</option>
                <option value="D-10">D-10 (PG-1)</option>
                <option value="D-11">D-11 (PG-2)</option>
              </select>
            )}

            {activeTab === 'models' && (
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories (7)</option>
                <option value="CAT01">Computers</option>
                <option value="CAT02">Laptop</option>
                <option value="CAT03">Printer</option>
                <option value="CAT04">UPS</option>
                <option value="CAT05">Battery</option>
                <option value="CAT06">LCD Projector</option>
                <option value="CAT07">Interactive Panel</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Computer Batches Table */}
        {activeTab === 'batches' && (
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2 min-h-0">
            {isLoading ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Loading real-time purchase batches from database...</span>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                No purchase batches match your search criteria.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-2.5 px-3">Batch ID</th>
                      <th className="py-2.5 px-3">Lab</th>
                      <th className="py-2.5 px-3">Model & Brand</th>
                      <th className="py-2.5 px-3">Purchase Date</th>
                      <th className="py-2.5 px-3 text-center">Qty (Cur/Orig)</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Cost</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredBatches.map((batch) => {
                      const isExpanded = expandedBatchId === batch.batch_id;
                      return (
                        <React.Fragment key={batch.batch_id}>
                          <tr
                            onClick={() => setExpandedBatchId(isExpanded ? null : batch.batch_id)}
                            className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                              {batch.batch_id}
                              <span className="text-[10px] text-slate-500 font-normal block">
                                Reg #{batch.dead_stock_sr_no}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-200">{batch.lab_code}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                                {batch.lab_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-white">
                                {batch.brand} {batch.model_name}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                {batch.processor && <span>{batch.processor.slice(0, 24)}...</span>}
                                {batch.ram_gb && (
                                  <span className="px-1 rounded bg-slate-800 text-slate-300 font-mono">
                                    {batch.ram_gb}GB
                                  </span>
                                )}
                                {batch.storage && (
                                  <span className="px-1 rounded bg-slate-800 text-slate-300 font-mono">
                                    {batch.storage}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>{batch.purchase_date}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-white">{batch.quantity_current}</span>
                              <span className="text-slate-500"> / {batch.quantity_original}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              {batch.unit_rate_formatted}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                              {batch.total_cost_formatted}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  batch.status === 'ACTIVE/RECORDED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : batch.status === 'OK'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : batch.status === 'TRANSFERRED_IN'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {batch.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">
                              {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-950/70 border-b border-indigo-500/20">
                              <td colSpan={9} className="p-3.5 space-y-2.5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                                      Technical Specifications
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-1 mt-1.5">
                                      <li>
                                        <span className="text-slate-400">Processor:</span>{' '}
                                        <strong className="text-white">{batch.processor || 'As listed'}</strong>
                                      </li>
                                      <li>
                                        <span className="text-slate-400">RAM:</span>{' '}
                                        <strong className="text-white">{batch.ram_gb ? `${batch.ram_gb} GB` : 'Standard'}</strong>
                                      </li>
                                      <li>
                                        <span className="text-slate-400">Storage:</span>{' '}
                                        <strong className="text-white">{batch.storage || 'As per register'}</strong>
                                      </li>
                                      <li>
                                        <span className="text-slate-400">OS:</span>{' '}
                                        <strong className="text-white">{batch.operating_system || 'Unspecified'}</strong>
                                      </li>
                                      {batch.monitor_size_in && (
                                        <li>
                                          <span className="text-slate-400">Monitor:</span>{' '}
                                          <strong className="text-white">{batch.monitor_size_in}" LED Display</strong>
                                        </li>
                                      )}
                                    </ul>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                                      Procurement & Warranty
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-1 mt-1.5">
                                      <li>
                                        <span className="text-slate-400">Supplier:</span>{' '}
                                        <strong className="text-white">{batch.supplier_name}</strong>
                                      </li>
                                      <li>
                                        <span className="text-slate-400">Warranty:</span>{' '}
                                        <strong className="text-white">
                                          {batch.warranty_years ? `${batch.warranty_years} Years Onsite Service` : 'Standard'}
                                        </strong>
                                      </li>
                                      <li>
                                        <span className="text-slate-400">Dead-Stock Register No:</span>{' '}
                                        <strong className="text-white font-mono">{batch.dead_stock_sr_no}</strong>
                                      </li>
                                    </ul>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                                      Serial Numbers Recorded
                                    </p>
                                    {batch.serial_numbers_list && batch.serial_numbers_list.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto">
                                        {batch.serial_numbers_list.map((sn, idx) => (
                                          <span
                                            key={idx}
                                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700"
                                          >
                                            {sn}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-500 mt-1 italic">
                                        Serials logged in bulk dead-stock folio
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                    Full Register Raw Ledger Description:
                                  </p>
                                  <p className="text-[11px] text-slate-300 font-mono mt-0.5 leading-relaxed">
                                    {batch.raw_description}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Normalized Equipment Models (55 Models) */}
        {activeTab === 'models' && (
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2 min-h-0">
            {isLoading ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Loading 55 normalized equipment models...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                No equipment models match your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredModels.map((model) => (
                  <div
                    key={model.model_id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          {model.model_id}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                          {model.category_name} ({model.category_id})
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5">
                        {model.brand} {model.model_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        {model.configuration_summary || 'Standard manufacturer configuration'}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Brand: <strong className="text-slate-300">{model.brand || 'Generic'}</strong></span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Normalized 3NF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Department Laboratories Summary */}
        {activeTab === 'labs' && (
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {labsSummary.map((lab) => (
                <div
                  key={lab.lab_code}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        {lab.lab_code}
                      </span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {lab.total_investment_formatted}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1.5">{lab.lab_name}</h4>

                    <div className="grid grid-cols-2 gap-2 my-2.5 text-center">
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block">Active Systems</span>
                        <strong className="text-sm font-bold text-emerald-400">{lab.total_current_qty}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block">Total Batches</span>
                        <strong className="text-sm font-bold text-indigo-300">{lab.total_batches}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p>
                        <strong>Models:</strong> {lab.models.join(', ')}
                      </p>
                      <p>
                        <strong>Vendors:</strong> {lab.brands.join(', ')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLabFilter(lab.lab_code);
                      setActiveTab('batches');
                    }}
                    className="mt-3 w-full py-1.5 text-center text-xs font-semibold text-indigo-400 hover:text-white rounded-lg bg-indigo-500/10 hover:bg-indigo-600 transition-colors"
                  >
                    View {lab.lab_code} Purchase Batches →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>Authoritative Supabase & 3NF Dead-Stock Engine Active • Synced in Real Time</span>
          <span className="font-mono text-[10px] text-indigo-400">Esc to Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
