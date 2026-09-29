import {
  ComputerBatchRecord,
  NormalizedEquipmentModel,
  EquipmentCategoryRecord,
  LabInventorySummary,
  InventoryStats,
  EquipmentItem,
  EquipmentStatus,
  InventoryDashboardPayload,
} from './types.js';
import { INITIAL_COMPUTER_BATCHES, INITIAL_EQUIPMENT_MODELS } from './inventoryData.js';

export class InventoryService {
  private batchesMap: Map<string, ComputerBatchRecord> = new Map();
  private modelsMap: Map<string, NormalizedEquipmentModel> = new Map();
  private equipmentMap: Map<string, EquipmentItem> = new Map();

  constructor() {
    this.seed();
  }

  public seed(): void {
    INITIAL_COMPUTER_BATCHES.forEach((b) => {
      this.batchesMap.set(b.batch_id, {
        ...b,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    INITIAL_EQUIPMENT_MODELS.forEach((m) => {
      this.modelsMap.set(m.model_id, {
        ...m,
        created_at: m.created_at || new Date().toISOString(),
      });
    });

    // Seed individual equipment instances from purchase batches
    let itemCounter = 1;
    for (const b of this.batchesMap.values()) {
      const count = Math.min(b.quantity_current, 25); // cap per batch for balanced dataset
      for (let i = 0; i < count; i++) {
        const itemIdx = i + 1;
        const serial =
          b.serial_numbers_list && b.serial_numbers_list[i]
            ? b.serial_numbers_list[i]
            : `${b.brand.slice(0, 3).toUpperCase()}-${b.batch_id.replace('BAT', '')}-${100 + itemIdx}`;

        // Deterministic status assignment for realistic simulation
        let status: EquipmentStatus = 'OPERATIONAL';
        let healthScore = 95 - (i % 6) * 3;

        if (b.status === 'PARTIALLY_WRITTEN_OFF' && i >= count - 2) {
          status = 'PARTIALLY_WRITTEN_OFF';
          healthScore = 42;
        } else if ((itemCounter + i) % 17 === 0) {
          status = 'MAINTENANCE';
          healthScore = 68;
        } else if ((itemCounter + i) % 23 === 0) {
          status = 'OFFLINE';
          healthScore = 52;
        } else if ((itemCounter + i) % 7 === 0) {
          status = 'IN_USE';
          healthScore = 92;
        }

        const id = `EQ-${b.batch_id}-${String(itemIdx).padStart(2, '0')}`;
        const assetTag = `ASSET-${b.lab_code}-${String(itemCounter).padStart(4, '0')}`;

        this.equipmentMap.set(id, {
          id,
          batch_id: b.batch_id,
          asset_tag: assetTag,
          serial_number: serial,
          equipment_name: `${b.brand} ${b.model_name}`,
          category: 'Desktop Computers',
          brand: b.brand,
          model: b.model_name,
          lab_code: b.lab_code,
          lab_name: b.lab_name,
          processor: b.processor,
          ram: b.ram_gb ? `${b.ram_gb} GB DDR` : '8 GB DDR4',
          storage: b.storage,
          os: b.operating_system,
          status,
          health_score: healthScore,
          purchase_date: b.purchase_date,
          unit_cost: b.unit_rate,
          unit_cost_formatted: b.unit_rate_formatted,
          supplier_name: b.supplier_name,
          last_maintenance: '2026-08-15',
          next_maintenance: status === 'MAINTENANCE' ? '2026-09-30' : '2026-11-20',
          assigned_to: status === 'IN_USE' ? `Workstation ${itemIdx}` : 'General Lab Pool',
        });
        itemCounter++;
      }
    }

    // Seed peripheral equipment (Projectors, Printers, Smart Panels, UPS) for labs D-01 through D-11
    const labCodes = ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06', 'D-07', 'D-08', 'D-09', 'D-10', 'D-11'];
    const labNames: Record<string, string> = {
      'D-01': 'Computing Lab 1',
      'D-02': 'Software Engineering Lab',
      'D-03': 'Data Science & AI Lab',
      'D-04': 'Networks & Security Lab',
      'D-05': 'Embedded Systems & IoT Lab',
      'D-06': 'Cybersecurity Operations Center',
      'D-07': 'Cloud Computing & DevOps Lab',
      'D-08': 'Robotics & Automation Bench',
      'D-09': 'Graphics & Multimedia Studio',
      'D-10': 'Hardware Testing & Fabrication',
      'D-11': 'High Performance Compute Cluster',
    };

    const peripherals = [
      { name: 'Epson EB-E01 LCD Projector', cat: 'LCD Projector', brand: 'Epson', model: 'EB-E01', cost: 38500, costFmt: '₹38,500' },
      { name: 'HP LaserJet Pro M404dn', cat: 'Printer', brand: 'HP', model: 'LaserJet Pro M404dn', cost: 29500, costFmt: '₹29,500' },
      { name: 'APC Smart-UPS 5000VA Online', cat: 'UPS & Power', brand: 'APC', model: 'SURTD5000XLI', cost: 115000, costFmt: '₹1,15,000' },
      { name: 'ViewSonic 75" ViewBoard 4K', cat: 'Interactive Panel', brand: 'ViewSonic', model: 'IFP7550-3', cost: 165000, costFmt: '₹1,65,000' },
    ];

    labCodes.forEach((code, idx) => {
      peripherals.forEach((p, pIdx) => {
        const id = `EQ-PERIPH-${code}-${pIdx + 1}`;
        const tag = `ASSET-${code}-P${pIdx + 1}`;
        let status: EquipmentStatus = 'OPERATIONAL';
        let healthScore = 96;
        if (pIdx === 0 && idx % 4 === 1) {
          status = 'MAINTENANCE';
          healthScore = 72;
        } else if (pIdx === 2 && idx % 5 === 2) {
          status = 'IN_USE';
          healthScore = 90;
        }

        this.equipmentMap.set(id, {
          id,
          batch_id: `BAT-PERIPH-${code}`,
          asset_tag: tag,
          serial_number: `SN-${p.brand.slice(0, 3).toUpperCase()}-${code}-${100 + pIdx}`,
          equipment_name: p.name,
          category: p.cat,
          brand: p.brand,
          model: p.model,
          lab_code: code,
          lab_name: labNames[code] || `Laboratory ${code}`,
          processor: 'N/A',
          ram: 'N/A',
          storage: 'N/A',
          os: 'Firmware v4.2',
          status,
          health_score: healthScore,
          purchase_date: '2023-04-10',
          unit_cost: p.cost,
          unit_cost_formatted: p.costFmt,
          supplier_name: 'Campus IT Infrastructure Solutions',
          last_maintenance: '2026-07-20',
          next_maintenance: '2026-10-15',
          assigned_to: `${labNames[code] || code} Core Equipment`,
        });
      });
    });
  }

  // ==========================================
  // Computer Purchase Batches (Real-Time CRUD)
  // ==========================================

  public getAllBatches(filters?: {
    lab_code?: string;
    brand?: string;
    model_name?: string;
    status?: string;
    os?: string;
    search?: string;
  }): ComputerBatchRecord[] {
    let result = Array.from(this.batchesMap.values());

    if (!filters) return result;

    if (filters.lab_code) {
      const code = filters.lab_code.toLowerCase();
      result = result.filter(
        (b) => b.lab_code.toLowerCase() === code || b.lab_name.toLowerCase().includes(code),
      );
    }

    if (filters.brand) {
      const brand = filters.brand.toLowerCase();
      result = result.filter((b) => b.brand.toLowerCase() === brand);
    }

    if (filters.status) {
      const status = filters.status.toLowerCase();
      result = result.filter((b) => b.status.toLowerCase() === status);
    }

    if (filters.os) {
      const os = filters.os.toLowerCase();
      result = result.filter((b) => b.operating_system.toLowerCase().includes(os));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.batch_id.toLowerCase().includes(s) ||
          b.lab_name.toLowerCase().includes(s) ||
          b.lab_code.toLowerCase().includes(s) ||
          b.model_name.toLowerCase().includes(s) ||
          b.brand.toLowerCase().includes(s) ||
          b.processor.toLowerCase().includes(s) ||
          b.raw_description.toLowerCase().includes(s) ||
          b.supplier_name.toLowerCase().includes(s) ||
          b.serial_numbers_raw.toLowerCase().includes(s),
      );
    }

    return result;
  }

  public getBatchById(id: string): ComputerBatchRecord | null {
    return this.batchesMap.get(id) || null;
  }

  public createBatch(batchData: Partial<ComputerBatchRecord>): ComputerBatchRecord {
    const batchId =
      batchData.batch_id ||
      `BAT${String(this.batchesMap.size + 10).padStart(4, '0')}`;

    const totalCost =
      batchData.total_cost ||
      (batchData.quantity_current || 0) * (batchData.unit_rate || 0);

    const record: ComputerBatchRecord = {
      batch_id: batchId,
      lab_code: batchData.lab_code || 'D-01',
      lab_name: batchData.lab_name || 'Laboratory',
      dead_stock_sr_no: batchData.dead_stock_sr_no || '001',
      brand: batchData.brand || 'Dell',
      model_name: batchData.model_name || 'OptiPlex',
      purchase_date: batchData.purchase_date || new Date().toISOString().split('T')[0],
      quantity_current: batchData.quantity_current ?? 1,
      quantity_original: batchData.quantity_original ?? batchData.quantity_current ?? 1,
      unit_rate: batchData.unit_rate || 0,
      unit_rate_formatted: `₹${(batchData.unit_rate || 0).toLocaleString('en-IN')}`,
      total_cost: totalCost,
      total_cost_formatted: `₹${totalCost.toLocaleString('en-IN')}`,
      supplier_name: batchData.supplier_name || 'Direct Supplier',
      warranty_years: batchData.warranty_years ?? 3,
      status: batchData.status || 'ACTIVE/RECORDED',
      processor: batchData.processor || '',
      ram_gb: batchData.ram_gb ?? 8,
      storage: batchData.storage || '',
      operating_system: batchData.operating_system || 'Windows 11',
      monitor_size_in: batchData.monitor_size_in ?? 19.5,
      serial_numbers_raw: batchData.serial_numbers_raw || '',
      serial_numbers_list: batchData.serial_numbers_raw
        ? batchData.serial_numbers_raw.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      raw_description: batchData.raw_description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.batchesMap.set(record.batch_id, record);
    return record;
  }

  public updateBatch(id: string, updates: Partial<ComputerBatchRecord>): ComputerBatchRecord | null {
    const existing = this.batchesMap.get(id);
    if (!existing) return null;

    const updated: ComputerBatchRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.quantity_current !== undefined || updates.unit_rate !== undefined) {
      const total =
        (updated.quantity_current || 0) * (updated.unit_rate || 0);
      updated.total_cost = total;
      updated.total_cost_formatted = `₹${total.toLocaleString('en-IN')}`;
    }

    this.batchesMap.set(id, updated);
    return updated;
  }

  public deleteBatch(id: string): boolean {
    return this.batchesMap.delete(id);
  }

  // ==========================================
  // Equipment Models Master (Real-Time CRUD)
  // ==========================================

  public getAllModels(filters?: {
    category_id?: string;
    brand?: string;
    search?: string;
  }): NormalizedEquipmentModel[] {
    let result = Array.from(this.modelsMap.values());

    if (!filters) return result;

    if (filters.category_id) {
      const cat = filters.category_id.toUpperCase();
      result = result.filter((m) => m.category_id.toUpperCase() === cat);
    }

    if (filters.brand) {
      const brand = filters.brand.toLowerCase();
      result = result.filter((m) => m.brand.toLowerCase().includes(brand));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.model_id.toLowerCase().includes(s) ||
          m.model_name.toLowerCase().includes(s) ||
          m.brand.toLowerCase().includes(s) ||
          m.category_name.toLowerCase().includes(s) ||
          m.configuration_summary.toLowerCase().includes(s),
      );
    }

    return result;
  }

  public getModelById(id: string): NormalizedEquipmentModel | null {
    return this.modelsMap.get(id) || null;
  }

  public createModel(data: Partial<NormalizedEquipmentModel>): NormalizedEquipmentModel {
    const modelId =
      data.model_id ||
      `MOD${String(this.modelsMap.size + 1).padStart(3, '0')}`;

    const model: NormalizedEquipmentModel = {
      model_id: modelId,
      category_id: data.category_id || 'CAT01',
      category_name: data.category_name || 'Computers',
      brand: data.brand || 'Generic',
      model_name: data.model_name || 'Equipment Model',
      configuration_summary: data.configuration_summary || '',
      attributes: data.attributes || {},
      created_at: new Date().toISOString(),
    };

    this.modelsMap.set(model.model_id, model);
    return model;
  }

  // ==========================================
  // Aggregated Analytics & Categories
  // ==========================================

  public getCategories(): EquipmentCategoryRecord[] {
    const categoryMap = new Map<string, { name: string; count: number }>();

    for (const m of this.modelsMap.values()) {
      const entry = categoryMap.get(m.category_id) || { name: m.category_name, count: 0 };
      entry.count += 1;
      categoryMap.set(m.category_id, entry);
    }

    return Array.from(categoryMap.entries()).map(([id, info]) => ({
      category_id: id,
      category_name: info.name,
      total_models: info.count,
    }));
  }

  public getLabsSummary(): LabInventorySummary[] {
    const labMap = new Map<string, {
      lab_name: string;
      batches: ComputerBatchRecord[];
    }>();

    for (const b of this.batchesMap.values()) {
      const entry = labMap.get(b.lab_code) || { lab_name: b.lab_name, batches: [] };
      entry.batches.push(b);
      labMap.set(b.lab_code, entry);
    }

    return Array.from(labMap.entries())
      .map(([code, data]) => {
        const totalCost = data.batches.reduce((acc, curr) => acc + curr.total_cost, 0);
        const currentQty = data.batches.reduce((acc, curr) => acc + curr.quantity_current, 0);
        const originalQty = data.batches.reduce((acc, curr) => acc + curr.quantity_original, 0);
        const brands = Array.from(new Set(data.batches.map((b) => b.brand)));
        const models = Array.from(new Set(data.batches.map((b) => b.model_name)));

        return {
          lab_code: code,
          lab_name: data.lab_name,
          total_batches: data.batches.length,
          total_current_qty: currentQty,
          total_original_qty: originalQty,
          total_investment: totalCost,
          total_investment_formatted: `₹${totalCost.toLocaleString('en-IN')}`,
          brands,
          models,
        };
      })
      .sort((a, b) => a.lab_code.localeCompare(b.lab_code));
  }

  public getOverallStats(): InventoryStats {
    const batches = Array.from(this.batchesMap.values());
    const totalCurrentQty = batches.reduce((acc, b) => acc + b.quantity_current, 0);
    const totalOriginalQty = batches.reduce((acc, b) => acc + b.quantity_original, 0);
    const totalCost = batches.reduce((acc, b) => acc + b.total_cost, 0);

    const statusCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    const supplierCounts: Record<string, number> = {};

    batches.forEach((b) => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + b.quantity_current;
      const os = b.operating_system || 'Unspecified';
      osCounts[os] = (osCounts[os] || 0) + b.quantity_current;
      brandCounts[b.brand] = (brandCounts[b.brand] || 0) + b.quantity_current;
      supplierCounts[b.supplier_name] = (supplierCounts[b.supplier_name] || 0) + 1;
    });

    let topSupplier = 'Veetrag Computers Private Ltd.';
    let maxSupCount = 0;
    for (const [sup, count] of Object.entries(supplierCounts)) {
      if (count > maxSupCount) {
        maxSupCount = count;
        topSupplier = sup;
      }
    }

    const labs = new Set(batches.map((b) => b.lab_code));

    return {
      total_batches: batches.length,
      total_current_quantity: totalCurrentQty,
      total_original_quantity: totalOriginalQty,
      total_investment: totalCost,
      total_investment_formatted: `₹${totalCost.toLocaleString('en-IN')}`,
      total_models: this.modelsMap.size,
      total_categories: this.getCategories().length,
      total_labs: labs.size,
      top_supplier: topSupplier,
      status_breakdown: statusCounts,
      os_breakdown: osCounts,
      brand_breakdown: brandCounts,
    };
  }

  // ==========================================
  // Equipment Level Operations & Queries
  // ==========================================

  public getAllEquipment(filters?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
    brand?: string;
  }): EquipmentItem[] {
    let result = Array.from(this.equipmentMap.values());

    if (!filters) return result;

    if (filters.status && filters.status !== 'ALL') {
      const targetStatus = filters.status.toUpperCase();
      result = result.filter((e) => e.status.toUpperCase() === targetStatus);
    }

    if (filters.lab_code && filters.lab_code !== 'ALL') {
      const code = filters.lab_code.toLowerCase();
      result = result.filter(
        (e) => e.lab_code.toLowerCase() === code || e.lab_name.toLowerCase().includes(code),
      );
    }

    if (filters.category && filters.category !== 'ALL') {
      const cat = filters.category.toLowerCase();
      result = result.filter((e) => e.category.toLowerCase().includes(cat));
    }

    if (filters.brand && filters.brand !== 'ALL') {
      const brand = filters.brand.toLowerCase();
      result = result.filter((e) => e.brand.toLowerCase() === brand);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.equipment_name.toLowerCase().includes(q) ||
          e.serial_number.toLowerCase().includes(q) ||
          e.asset_tag.toLowerCase().includes(q) ||
          e.lab_code.toLowerCase().includes(q) ||
          e.lab_name.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q) ||
          e.model.toLowerCase().includes(q) ||
          e.processor.toLowerCase().includes(q) ||
          e.batch_id.toLowerCase().includes(q),
      );
    }

    return result;
  }

  public getEquipmentById(id: string): EquipmentItem | null {
    return this.equipmentMap.get(id) || null;
  }

  public updateEquipment(id: string, updates: Partial<EquipmentItem>): EquipmentItem | null {
    const existing = this.equipmentMap.get(id);
    if (!existing) return null;

    const updated: EquipmentItem = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
    };

    this.equipmentMap.set(id, updated);
    return updated;
  }

  public getDashboardPayload(filters?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
  }): InventoryDashboardPayload {
    const allItems = Array.from(this.equipmentMap.values());
    const filteredEquipment = this.getAllEquipment(filters);

    let operationalCount = 0;
    let inUseCount = 0;
    let maintenanceCount = 0;
    let offlineCount = 0;

    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const labCounts: Record<string, number> = {};

    let totalInvestment = 0;

    allItems.forEach((item) => {
      totalInvestment += item.unit_cost;
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      labCounts[item.lab_code] = (labCounts[item.lab_code] || 0) + 1;

      if (item.status === 'OPERATIONAL') operationalCount++;
      else if (item.status === 'IN_USE') inUseCount++;
      else if (item.status === 'MAINTENANCE') maintenanceCount++;
      else if (item.status === 'OFFLINE' || item.status === 'PARTIALLY_WRITTEN_OFF') offlineCount++;
    });

    const labs = this.getLabsSummary();
    const batches = this.getAllBatches();
    const models = this.getAllModels();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_equipment: allItems.length,
        operational_count: operationalCount,
        in_use_count: inUseCount,
        maintenance_count: maintenanceCount,
        offline_count: offlineCount,
        total_batches: batches.length,
        total_models: models.length,
        total_labs: labs.length,
        total_investment: totalInvestment,
        total_investment_formatted: `₹${totalInvestment.toLocaleString('en-IN')}`,
        status_breakdown: statusCounts,
        category_breakdown: categoryCounts,
        lab_breakdown: labCounts,
      },
      equipment: filteredEquipment,
      batches,
      models,
      labs,
    };
  }
}

export const inventoryService = new InventoryService();
