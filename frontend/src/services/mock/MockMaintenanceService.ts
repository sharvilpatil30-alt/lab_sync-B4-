import { IMaintenanceService } from '../types';
import { MaintenanceRecord, MaintenanceFilters, ApiResponse } from '../../types';
import { maintenanceData } from '../../data/mock';

const MAINT_KEY = 'smart_campus_mock_maintenance';

function getStoredMaintenance(): MaintenanceRecord[] {
  const stored = localStorage.getItem(MAINT_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(MAINT_KEY, JSON.stringify(maintenanceData));
  return maintenanceData as unknown as MaintenanceRecord[];
}

function saveMaintenance(records: MaintenanceRecord[]) {
  localStorage.setItem(MAINT_KEY, JSON.stringify(records));
}

export class MockMaintenanceService implements IMaintenanceService {
  async list(filters?: MaintenanceFilters): Promise<ApiResponse<MaintenanceRecord[]>> {
    await new Promise((r) => setTimeout(r, 200));
    let records = getStoredMaintenance();

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        records = records.filter((r) => r.status === filters.status);
      }
      if (filters.targetType && filters.targetType !== 'all') {
        records = records.filter((r) => r.targetType === filters.targetType);
      }
    }

    return {
      success: true,
      message: 'Maintenance records retrieved',
      data: records,
    };
  }

  async getById(id: string): Promise<ApiResponse<MaintenanceRecord>> {
    await new Promise((r) => setTimeout(r, 150));
    const records = getStoredMaintenance();
    const item = records.find((r) => r.id === id || r.maintenanceId === id);
    if (!item) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Maintenance record ${id} not found` },
        },
      };
    }
    return {
      success: true,
      message: 'Maintenance record retrieved',
      data: item,
    };
  }

  async create(data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MaintenanceRecord>> {
    await new Promise((r) => setTimeout(r, 250));
    const records = getStoredMaintenance();
    const newRecord: MaintenanceRecord = {
      ...data,
      id: `maint_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    saveMaintenance(records);

    return {
      success: true,
      message: 'Maintenance scheduled successfully',
      data: newRecord,
    };
  }

  async updateStatus(id: string, status: string): Promise<ApiResponse<MaintenanceRecord>> {
    await new Promise((r) => setTimeout(r, 200));
    const records = getStoredMaintenance();
    const index = records.findIndex((r) => r.id === id || r.maintenanceId === id);
    if (index === -1) {
      throw {
        response: {
          status: 404,
          data: { success: false, message: `Maintenance record ${id} not found` },
        },
      };
    }

    records[index].status = status as any;
    records[index].updatedAt = new Date().toISOString();
    saveMaintenance(records);

    return {
      success: true,
      message: `Maintenance status updated to ${status}`,
      data: records[index],
    };
  }
}
