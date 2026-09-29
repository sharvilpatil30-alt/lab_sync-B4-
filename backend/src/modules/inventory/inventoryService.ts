import {
  ComputerBatchRecord,
  NormalizedEquipmentModel,
  EquipmentCategoryRecord,
  LabInventorySummary,
  InventoryStats,
} from './types.js';
import { INITIAL_COMPUTER_BATCHES, INITIAL_EQUIPMENT_MODELS } from './inventoryData.js';

export class InventoryService {
  private batchesMap: Map<string, ComputerBatchRecord> = new Map();
  private modelsMap: Map<string, NormalizedEquipmentModel> = new Map();

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
}

export const inventoryService = new InventoryService();
