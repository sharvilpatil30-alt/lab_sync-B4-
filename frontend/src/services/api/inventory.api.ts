import { apiClient } from './client';

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
   * Fetches full inventory dashboard payload from /api/v1/inventory
   */
  getInventoryDashboard: async (params?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
  }): Promise<InventoryDashboardPayload> => {
    const res = await apiClient.get('/inventory', { params });
    return res.data;
  },

  getEquipmentList: async (params?: {
    status?: string;
    lab_code?: string;
    category?: string;
    search?: string;
    brand?: string;
  }): Promise<{ success: boolean; count: number; data: EquipmentItem[] }> => {
    const res = await apiClient.get('/inventory/equipment', { params });
    return res.data;
  },

  updateEquipmentStatus: async (
    id: string,
    updates: Partial<EquipmentItem>,
  ): Promise<{ success: boolean; message: string; data: EquipmentItem }> => {
    const res = await apiClient.put(`/inventory/equipment/${id}`, updates);
    return res.data;
  },

  getBatches: async (params?: {
    lab_code?: string;
    brand?: string;
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: ComputerBatchRecord[] }> => {
    const res = await apiClient.get('/inventory/batches', { params });
    return res.data;
  },

  getBatchById: async (id: string): Promise<{ success: boolean; data: ComputerBatchRecord }> => {
    const res = await apiClient.get(`/inventory/batches/${id}`);
    return res.data;
  },

  getModels: async (params?: {
    category_id?: string;
    brand?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: NormalizedEquipmentModel[] }> => {
    const res = await apiClient.get('/inventory/models', { params });
    return res.data;
  },

  getCategories: async (): Promise<{ success: boolean; count: number; data: EquipmentCategoryRecord[] }> => {
    const res = await apiClient.get('/inventory/categories');
    return res.data;
  },

  getLabsSummary: async (): Promise<{ success: boolean; count: number; data: LabInventorySummary[] }> => {
    const res = await apiClient.get('/inventory/labs');
    return res.data;
  },

  getSummaryStats: async (): Promise<{ success: boolean; data: InventoryStats }> => {
    const res = await apiClient.get('/inventory/summary');
    return res.data;
  },
};
