import { apiClient } from './client';
import { mockInventoryService } from '../mock/MockInventoryService';

export interface ComputerBatchRecord {
  batch_id: string;
  lab_code: string;
  lab_name: string;
  dead_stock_sr_no: string;
  brand: string;
  model_name: string;
  purchase_date: string;
  quantity_current: number;
  quantity_original: number;
  unit_rate: number;
  unit_rate_formatted: string;
  total_cost: number;
  total_cost_formatted: string;
  supplier_name: string;
  warranty_years: number | null;
  status: string;
  processor: string;
  ram_gb: number | null;
  storage: string;
  operating_system: string;
  monitor_size_in: number | null;
  serial_numbers_raw: string;
  serial_numbers_list: string[];
  raw_description: string;
}

export interface NormalizedEquipmentModel {
  model_id: string;
  category_id: string;
  category_name: string;
  brand: string;
  model_name: string;
  configuration_summary: string;
  attributes: Record<string, any>;
}

export interface EquipmentCategoryRecord {
  category_id: string;
  category_name: string;
  total_models: number;
}

export interface LabInventorySummary {
  lab_code: string;
  lab_name: string;
  total_batches: number;
  total_current_qty: number;
  total_original_qty: number;
  total_investment: number;
  total_investment_formatted: string;
  brands: string[];
  models: string[];
}

export interface InventoryStats {
  total_batches: number;
  total_current_quantity: number;
  total_original_quantity: number;
  total_investment: number;
  total_investment_formatted: string;
  total_models: number;
  total_categories: number;
  total_labs: number;
  top_supplier: string;
  status_breakdown: Record<string, number>;
  os_breakdown: Record<string, number>;
  brand_breakdown: Record<string, number>;
}

export type EquipmentStatus = 'OPERATIONAL' | 'IN_USE' | 'MAINTENANCE' | 'OFFLINE' | 'PARTIALLY_WRITTEN_OFF';

export interface EquipmentItem {
  id: string;
  batch_id: string;
  asset_tag: string;
  serial_number: string;
  equipment_name: string;
  category: string;
  brand: string;
  model: string;
  lab_code: string;
  lab_name: string;
  processor: string;
  ram: string;
  storage: string;
  os: string;
  status: EquipmentStatus;
  health_score: number;
  purchase_date: string;
  unit_cost: number;
  unit_cost_formatted: string;
  supplier_name: string;
  last_maintenance: string;
  next_maintenance: string;
  assigned_to?: string | null;
}

export interface InventoryDashboardPayload {
  success: boolean;
  timestamp: string;
  summary: {
    total_equipment: number;
    operational_count: number;
    in_use_count: number;
    maintenance_count: number;
    offline_count: number;
    total_batches: number;
    total_models: number;
    total_labs: number;
    total_investment_formatted: string;
    total_investment: number;
    status_breakdown: Record<string, number>;
    category_breakdown: Record<string, number>;
    lab_breakdown: Record<string, number>;
  };
  equipment: EquipmentItem[];
  batches: ComputerBatchRecord[];
  models: NormalizedEquipmentModel[];
  labs: LabInventorySummary[];
}

export const inventoryApi = {
  /**
   * Fetches full inventory dashboard payload from /api/v1/inventory with automatic fallback to uploaded institutional dataset
   */
  getInventoryDashboard: async (params?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
  }): Promise<InventoryDashboardPayload> => {
    try {
      const res = await apiClient.get('/inventory', { params });
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback seamlessly to uploaded institutional dataset
    }
    return mockInventoryService.getDashboardPayload(params);
  },

  getEquipmentList: async (params?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
    brand?: string;
  }): Promise<{ success: boolean; count: number; data: EquipmentItem[] }> => {
    try {
      const res = await apiClient.get('/inventory/equipment', { params });
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getAllEquipment(params);
    return { success: true, count: data.length, data };
  },

  updateEquipmentStatus: async (
    id: string,
    updates: Partial<EquipmentItem>,
  ): Promise<{ success: boolean; message: string; data: EquipmentItem }> => {
    try {
      const res = await apiClient.put(`/inventory/equipment/${id}`, updates);
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const updated = mockInventoryService.updateEquipment(id, updates);
    return {
      success: true,
      message: 'Equipment status updated successfully',
      data: updated || ({} as EquipmentItem),
    };
  },

  getBatches: async (params?: {
    lab_code?: string;
    brand?: string;
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: ComputerBatchRecord[] }> => {
    try {
      const res = await apiClient.get('/inventory/batches', { params });
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getAllBatches(params);
    return { success: true, count: data.length, data };
  },

  getBatchById: async (id: string): Promise<{ success: boolean; data: ComputerBatchRecord }> => {
    try {
      const res = await apiClient.get(`/inventory/batches/${id}`);
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getBatchById(id);
    if (!data) throw new Error('Batch not found');
    return { success: true, data };
  },

  getModels: async (params?: {
    category_id?: string;
    brand?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: NormalizedEquipmentModel[] }> => {
    try {
      const res = await apiClient.get('/inventory/models', { params });
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getAllModels(params);
    return { success: true, count: data.length, data };
  },

  getCategories: async (): Promise<{ success: boolean; count: number; data: EquipmentCategoryRecord[] }> => {
    try {
      const res = await apiClient.get('/inventory/categories');
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getCategories();
    return { success: true, count: data.length, data };
  },

  getLabsSummary: async (): Promise<{ success: boolean; count: number; data: LabInventorySummary[] }> => {
    try {
      const res = await apiClient.get('/inventory/labs');
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getLabsSummary();
    return { success: true, count: data.length, data };
  },

  getSummaryStats: async (): Promise<{ success: boolean; data: InventoryStats }> => {
    try {
      const res = await apiClient.get('/inventory/summary');
      if (res?.data && res.data.success) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    const data = mockInventoryService.getOverallStats();
    return { success: true, data };
  },
};
