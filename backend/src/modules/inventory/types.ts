/**
 * Real-Time Dead-Stock & Normalized Equipment Master Types
 */

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
  status: 'ACTIVE/RECORDED' | 'OK' | 'PARTIALLY_WRITTEN_OFF' | 'TRANSFERRED_IN' | string;
  processor: string;
  ram_gb: number | null;
  storage: string;
  operating_system: string;
  monitor_size_in: number | null;
  serial_numbers_raw: string;
  serial_numbers_list: string[];
  raw_description: string;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedEquipmentModel {
  model_id: string;
  category_id: string;
  category_name: string;
  brand: string;
  model_name: string;
  configuration_summary: string;
  attributes: Record<string, string | number>;
  created_at?: string;
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
